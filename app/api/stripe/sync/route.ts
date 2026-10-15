import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, getUserFromRequest } from "@/lib/server/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile.stripe_subscription_id || !profile.stripe_customer_id) {
      return NextResponse.json({ error: "サブスクリプションが見つかりません。" }, { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    if (customerId !== profile.stripe_customer_id) {
      return NextResponse.json({ error: "サブスクリプション情報を確認できません。" }, { status: 409 });
    }

    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId === process.env.STRIPE_STANDARD_PRICE_ID
      ? "standard"
      : priceId === process.env.STRIPE_PREMIUM_PRICE_ID
        ? "premium"
        : null;

    let values: { plan: string; stripe_subscription_id: string | null; subscription_status: string };
    if (["active", "trialing"].includes(subscription.status) && plan) {
      values = {
        plan,
        stripe_subscription_id: subscription.id,
        subscription_status: "active",
      };
    } else if (subscription.status === "past_due") {
      values = {
        plan: profile.plan,
        stripe_subscription_id: subscription.id,
        subscription_status: "past_due",
      };
    } else if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
      values = {
        plan: "free",
        stripe_subscription_id: null,
        subscription_status: "inactive",
      };
    } else {
      return NextResponse.json({ error: "プランの更新をStripeで確認できませんでした。" }, { status: 409 });
    }

    if (["active", "trialing"].includes(subscription.status) && !plan) {
      console.error(`Unknown Stripe price ${priceId} on subscription ${subscription.id}`);
      return NextResponse.json({ error: "登録されていない料金プランです。" }, { status: 500 });
    }

    const { data: updatedProfile, error: updateError } = await admin
      .from("user_profiles")
      .update(values)
      .eq("id", user.id)
      .eq("stripe_subscription_id", subscription.id)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedProfile) {
      return NextResponse.json({ error: "プラン情報が先に更新されました。画面を再読み込みしてください。" }, { status: 409 });
    }

    return NextResponse.json({ plan: values.plan, subscription_status: values.subscription_status });
  } catch (error) {
    console.error("Stripe subscription sync error:", error);
    return NextResponse.json({ error: "プラン情報を更新できませんでした。" }, { status: 500 });
  }
}
