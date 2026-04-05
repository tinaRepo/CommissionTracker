import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: `Webhook Error: ${e.message}` }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const standardPriceId = process.env.STRIPE_STANDARD_PRICE_ID!;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID!;

  // Price IDからプランを判定
  function getPlanFromPriceId(priceId: string): "standard" | "premium" | null {
    if (priceId === standardPriceId) return "standard";
    if (priceId === premiumPriceId) return "premium";
    return null;
  }

  try {
    switch (event.type) {

      // 決済完了 → プランをアップグレード
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // サブスクリプションからPrice IDを取得
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        if (!plan) {
          console.error("Unknown priceId:", priceId);
          break;
        }

        await adminSupabase
          .from("user_profiles")
          .update({
            plan,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Plan upgraded to ${plan} for customer ${customerId}`);
        break;
      }

      // サブスクリプション更新（プラン変更にも対応）
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        const status = subscription.status;

        if (status === "active" && plan) {
          await adminSupabase
            .from("user_profiles")
            .update({
              plan,
              subscription_status: "active",
            })
            .eq("stripe_customer_id", customerId);
        } else if (status === "canceled" || status === "unpaid") {
          await adminSupabase
            .from("user_profiles")
            .update({
              plan: "free",
              stripe_subscription_id: null,
              subscription_status: "inactive",
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // 解約 → 無料プランに戻す
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await adminSupabase
          .from("user_profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: "inactive",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Plan downgraded to free for customer ${customerId}`);
        break;
      }
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
