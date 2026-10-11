import Stripe from "stripe";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/server/admin";
import { alertAdmin } from "@/lib/server/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDからプランを判定
function getPlanFromPriceId(priceId: string | undefined): "standard" | "premium" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return "standard";
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium";
  return null;
}

function customerIdOf(c: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

async function mustUpdate(q: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await q;
  if (error) throw new Error(`profile update failed: ${error.message}`);
}

// サブスクリプションの「最新の状態」をプロフィールへ反映する。
// どのイベントから呼ばれても同じ結果になる（イベントの到着順に依存しない）。
async function applySubscription(admin: SupabaseClient, sub: Stripe.Subscription) {
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return;

  switch (sub.status) {
    case "active":
    case "trialing": {
      const priceId = sub.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);
      if (!plan) {
        await alertAdmin(admin, "stripe-unknown-price", "Stripeの未知のPrice IDを受信しました",
          `priceId=${priceId} subscription=${sub.id} customer=${customerId}\nSTRIPE_*_PRICE_ID の環境変数を確認してください。`);
        throw new Error(`Unknown priceId: ${priceId}`); // 500を返してStripeに再送させる（環境変数の修正後に回復する）
      }
      await mustUpdate(admin.from("user_profiles")
        .update({ plan, stripe_subscription_id: sub.id, subscription_status: "active" })
        .eq("stripe_customer_id", customerId));
      break;
    }
    case "past_due":
      // 支払い失敗の再試行中。プランは維持し、状態だけ記録する（画面で支払い方法の更新を促す）
      await mustUpdate(admin.from("user_profiles")
        .update({ stripe_subscription_id: sub.id, subscription_status: "past_due" })
        .eq("stripe_customer_id", customerId));
      break;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      // 解約・失効。ただし、別のサブスクリプションに乗り換え済みなら無料に戻さない
      await mustUpdate(admin.from("user_profiles")
        .update({ plan: "free", stripe_subscription_id: null, subscription_status: "inactive" })
        .eq("stripe_customer_id", customerId)
        .or(`stripe_subscription_id.eq.${sub.id},stripe_subscription_id.is.null`));
      break;
    default:
      break; // incomplete / paused などは何もしない
  }
}

// 通知時点ではなく最新の状態を使う（古いイベントが後から届いても巻き戻らない）
async function retrieveLatest(subId: string, fallback?: Stripe.Subscription): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subId);
  } catch (e: any) {
    if (e?.code === "resource_missing" && fallback) return fallback;
    throw e;
  }
}

// 支払い失敗の連絡メール（Stripeの再試行が続いている間に、支払い方法の更新を案内する）
async function notifyPaymentFailed(admin: SupabaseClient, customerId: string) {
  const { data: profile } = await admin
    .from("user_profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (!profile || !process.env.RESEND_API_KEY) return;
  const { data } = await admin.auth.admin.getUserById(profile.id);
  const email = data?.user?.email;
  if (!email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "ツクリスト <onboarding@resend.dev>",
    to: email,
    subject: "【ツクリスト】お支払いを確認できませんでした",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1d1f">
      <h2 style="font-weight:600">お支払いを確認できませんでした</h2>
      <p style="line-height:1.8">有料プランの更新時のお支払いが完了しませんでした。カードの有効期限や利用限度額をご確認のうえ、お支払い方法を更新してください。しばらく更新されない場合、プランは無料プランに戻ります。</p>
      <p style="margin:24px 0"><a href="${appUrl}/pricing" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px">お支払い方法を更新する</a></p>
      <p style="color:#6e6e73;font-size:12px">ログイン後、プラン画面の「プラン・支払い管理」から更新できます。</p></div>`,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 冪等性: 同じイベントIDは1回だけ処理する（Stripeは再送・重複配信することがある）
  const { data: claimed, error: claimError } = await admin
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (claimError) {
    console.error("stripe_events claim failed:", claimError);
    return NextResponse.json({ error: "temporary error" }, { status: 500 }); // Stripeが再送する
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      // 決済完了 → プランをアップグレード
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await applySubscription(admin, await stripe.subscriptions.retrieve(subId));
        break;
      }

      // サブスクリプションの作成・更新（プラン変更・状態変化）
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscription(admin, await retrieveLatest(sub.id, sub));
        break;
      }

      // 解約 → 無料プランに戻す
      case "customer.subscription.deleted": {
        await applySubscription(admin, event.data.object as Stripe.Subscription);
        break;
      }

      // 更新の支払い失敗 → 状態を記録してユーザーに連絡（初回の決済失敗は対象外）
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_create") break;
        const customerId = customerIdOf(invoice.customer);
        if (!customerId) break;
        await mustUpdate(admin.from("user_profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId)
          .neq("plan", "free"));
        await notifyPaymentFailed(admin, customerId);
        break;
      }

      // 支払い成功 → past_due から復帰
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.subscription;
        if (!subRef) break;
        const subId = typeof subRef === "string" ? subRef : subRef.id;
        await applySubscription(admin, await stripe.subscriptions.retrieve(subId));
        break;
      }

      default:
        break;
    }
  } catch (e: any) {
    console.error(`Webhook handler error (${event.type}):`, e);
    // 再送で再処理できるよう、処理済みの記録を取り消す
    await admin.from("stripe_events").delete().eq("id", event.id);
    await alertAdmin(admin, `stripe-webhook-${event.type}`, `Stripe Webhookの処理に失敗しました（${event.type}）`,
      `event=${event.id}\n${String(e?.stack ?? e)}`);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
