import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, getUserFromRequest } from "@/lib/server/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id ?? null;
}

async function refundableAmount(paymentIntentId: string): Promise<number> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const latestCharge = paymentIntent.latest_charge;
  const charge = typeof latestCharge === "string"
    ? await stripe.charges.retrieve(latestCharge)
    : latestCharge;

  if (!charge || charge.amount_captured === 0) return 0;
  return Math.max(0, charge.amount_captured - charge.amount_refunded);
}

async function paymentIntentsForCurrentPeriod(
  subscriptionId: string,
  periodStart: number,
  periodEnd: number,
  latestInvoiceId: string | null,
): Promise<string[]> {
  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    status: "paid",
    limit: 100,
  });

  return Array.from(new Set(invoices.data
    .filter(invoice =>
      subscriptionIdOf(invoice) === subscriptionId &&
      (invoice.id === latestInvoiceId ||
        (invoice.period_start < periodEnd && invoice.period_end > periodStart)) &&
      !!invoice.payment_intent
    )
    .map(invoice => typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent!.id)));
}

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

    let subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    if (customerId !== profile.stripe_customer_id) {
      return NextResponse.json({ error: "サブスクリプション情報を確認できません。" }, { status: 409 });
    }

    const metadata = subscription.metadata;
    if (
      metadata.app_cancel_refund_status === "complete" ||
      (metadata.app_cancel_refund_status === "ready" && subscription.status === "canceled")
    ) {
      return NextResponse.json({ cancelled: true, refunded: Number(metadata.app_cancel_refund_amount ?? 0) > 0 });
    }

    let refundAmount = Number(metadata.app_cancel_refund_amount);
    let periodStart = Number(metadata.app_cancel_refund_period_start);
    let periodEnd = Number(metadata.app_cancel_refund_period_end);
    let refundReason = metadata.app_cancel_refund_reason ?? "";
    const latestInvoice = subscription.latest_invoice;
    const latestInvoiceId = metadata.app_cancel_refund_invoice_id ||
      (typeof latestInvoice === "string" ? latestInvoice : latestInvoice?.id ?? null);
    const pendingRefund = metadata.app_cancel_refund_status === "pending";
    const refundReady = metadata.app_cancel_refund_status === "ready";

    if (!pendingRefund && !refundReady) {
      if (!["active", "past_due", "trialing", "unpaid"].includes(subscription.status)) {
        return NextResponse.json({ error: "解約できるサブスクリプションがありません。" }, { status: 409 });
      }
      if (subscription.currency !== "jpy") {
        return NextResponse.json({ error: "現在、カード返金に対応していない通貨のサブスクリプションです。" }, { status: 409 });
      }

      periodStart = subscription.current_period_start;
      periodEnd = subscription.current_period_end;

      const preview = await stripe.invoices.retrieveUpcoming({
        subscription: subscription.id,
        subscription_cancel_now: true,
        subscription_proration_behavior: "always_invoice",
      });
      const proratedAmount = preview.lines.data
        .filter(line =>
          line.proration &&
          line.amount < 0 &&
          line.period.start < periodEnd &&
          line.period.end > periodStart
        )
        .reduce((total, line) => total - line.amount, 0);

      refundAmount = proratedAmount;
      if (proratedAmount > 0) {
        const paymentIntents = await paymentIntentsForCurrentPeriod(
          subscription.id, periodStart, periodEnd, latestInvoiceId
        );
        let refundable = 0;
        for (const paymentIntentId of paymentIntents) {
          refundable += await refundableAmount(paymentIntentId);
        }
        if (refundable === 0) refundReason = "no_refundable_payment";
        refundAmount = Math.min(refundAmount, refundable);
      } else {
        refundReason = "no_proration";
      }

      subscription = await stripe.subscriptions.update(subscription.id, {
        metadata: {
          app_cancel_refund_status: "pending",
          app_cancel_refund_amount: String(refundAmount),
          app_cancel_refund_period_start: String(periodStart),
          app_cancel_refund_period_end: String(periodEnd),
          app_cancel_refund_invoice_id: latestInvoiceId ?? "",
          app_cancel_refund_reason: refundReason,
        },
      });
    } else if (!Number.isFinite(refundAmount) || !Number.isFinite(periodStart) || !Number.isFinite(periodEnd)) {
      throw new Error(`Invalid pending cancellation refund metadata for subscription ${subscription.id}`);
    }

    let refundedAmount = refundReady ? refundAmount : 0;
    if (!refundReady && refundAmount > 0) {
      const paymentIntents = await paymentIntentsForCurrentPeriod(
        subscription.id, periodStart, periodEnd, latestInvoiceId
      );
      let remaining = refundAmount;

      for (const paymentIntentId of paymentIntents) {
        if (remaining <= 0) break;

        const priorRefunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
        const alreadyRefundedForCancellation = priorRefunds.data
          .filter(refund => refund.metadata?.app_cancel_subscription_id === subscription.id)
          .reduce((total, refund) => total + refund.amount, 0);
        if (alreadyRefundedForCancellation > 0) {
          refundedAmount += alreadyRefundedForCancellation;
          remaining = Math.max(0, refundAmount - refundedAmount);
          continue;
        }

        const available = await refundableAmount(paymentIntentId);
        const amount = Math.min(remaining, available);
        if (amount <= 0) continue;

        const refund = await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            amount,
            reason: "requested_by_customer",
            metadata: { app_cancel_subscription_id: subscription.id },
          },
          { idempotencyKey: `app-cancel-refund-${subscription.id}-${paymentIntentId}` },
        );
        refundedAmount += refund.amount;
        remaining = Math.max(0, refundAmount - refundedAmount);
      }
    }

    if (refundedAmount < refundAmount) {
      throw new Error(
        `Only ${refundedAmount} of ${refundAmount} JPY could be refunded for subscription ${subscription.id}.`
      );
    }

    if (!refundReady) {
      subscription = await stripe.subscriptions.update(subscription.id, {
        metadata: {
          app_cancel_refund_status: "ready",
          app_cancel_refund_amount: String(refundedAmount),
          app_cancel_refund_period_start: String(periodStart),
          app_cancel_refund_period_end: String(periodEnd),
          app_cancel_refund_invoice_id: latestInvoiceId ?? "",
          app_cancel_refund_reason: refundReason,
        },
      });
    }

    if (subscription.status !== "canceled") {
      try {
        await stripe.subscriptions.cancel(
          subscription.id,
          { prorate: false },
          { idempotencyKey: `app-cancel-${subscription.id}` },
        );
      } catch (error) {
        subscription = await stripe.subscriptions.retrieve(subscription.id);
        if (subscription.status !== "canceled") throw error;
      }
    }

    return NextResponse.json({
      cancelled: true,
      refunded: refundedAmount > 0,
      refundReason: refundedAmount > 0 ? null : refundReason,
    });
  } catch (error) {
    console.error("subscription cancellation error:", error);
    return NextResponse.json(
      { error: "解約または返金の処理を完了できませんでした。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
