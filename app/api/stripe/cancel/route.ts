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
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id || !profile.stripe_customer_id) {
      return NextResponse.json({ error: "有効なサブスクリプションが見つかりません。" }, { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    if (customerId !== profile.stripe_customer_id) {
      return NextResponse.json({ error: "サブスクリプション情報を確認できません。" }, { status: 409 });
    }
    if (!["active", "past_due", "trialing", "unpaid"].includes(subscription.status)) {
      return NextResponse.json({ error: "解約できるサブスクリプションがありません。" }, { status: 409 });
    }

    const updatedSubscription = subscription.cancel_at_period_end
      ? subscription
      : await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    if (!updatedSubscription.cancel_at_period_end) {
      throw new Error(`Stripe did not schedule cancellation for subscription ${subscription.id}`);
    }

    return NextResponse.json({
      cancelled: true,
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      currentPeriodEnd: updatedSubscription.current_period_end,
    });
  } catch (error) {
    console.error("subscription cancellation scheduling error:", error);
    return NextResponse.json(
      { error: "解約予約を完了できませんでした。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
