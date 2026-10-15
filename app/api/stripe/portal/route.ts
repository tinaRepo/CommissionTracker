import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await adminSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
    if (!configuration) {
      console.error("Stripe billing portal configuration is missing");
      return NextResponse.json(
        { error: "プラン管理の設定が完了していません。時間をおいて再度お試しください。" },
        { status: 500 }
      );
    }

    const priceIds = [
      process.env.STRIPE_STANDARD_PRICE_ID,
      process.env.STRIPE_PREMIUM_PRICE_ID,
    ].filter((priceId): priceId is string => !!priceId);
    if (priceIds.length !== 2) {
      console.error("Stripe standard and premium price IDs are required for the billing portal");
      return NextResponse.json(
        { error: "プラン管理の設定が完了していません。時間をおいて再度お試しください。" },
        { status: 500 }
      );
    }

    const prices = await Promise.all(priceIds.map(priceId => stripe.prices.retrieve(priceId)));
    if (prices.some(price => !price.active || !price.recurring || price.currency !== "jpy")) {
      console.error("Stripe billing portal prices must be active recurring JPY prices");
      return NextResponse.json(
        { error: "プラン管理の設定に問題があります。サポートへお問い合わせください。" },
        { status: 500 }
      );
    }

    const premiumPrice = prices.find(price => price.id === process.env.STRIPE_PREMIUM_PRICE_ID);
    if (!premiumPrice) {
      console.error("Stripe premium price is missing from the billing portal prices");
      return NextResponse.json(
        { error: "プラン管理の設定に問題があります。サポートへお問い合わせください。" },
        { status: 500 }
      );
    }
    const premiumProductId = typeof premiumPrice.product === "string"
      ? premiumPrice.product
      : premiumPrice.product.id;
    const expectedProducts = [{ product: premiumProductId, prices: [premiumPrice.id] }];

    const portalConfiguration = await stripe.billingPortal.configurations.retrieve(configuration);
    const planUpdates = portalConfiguration.features.subscription_update;
    const currentProducts = (planUpdates.products ?? [])
      .map(product => ({ product: product.product, prices: [...product.prices].sort() }))
      .sort((a, b) => a.product.localeCompare(b.product));
    const configNeedsUpdate =
      !portalConfiguration.features.subscription_cancel.enabled ||
      portalConfiguration.features.subscription_cancel.mode !== "at_period_end" ||
      portalConfiguration.features.subscription_cancel.proration_behavior !== "none" ||
      !planUpdates.enabled ||
      planUpdates.proration_behavior !== "always_invoice" ||
      JSON.stringify(currentProducts) !== JSON.stringify(expectedProducts) ||
      planUpdates.default_allowed_updates.length !== 1 ||
      planUpdates.default_allowed_updates[0] !== "price";

    if (configNeedsUpdate) {
      await stripe.billingPortal.configurations.update(configuration, {
        features: {
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            proration_behavior: "none",
          },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price"],
            products: [{ product: premiumProductId, prices: [premiumPrice.id] }],
            proration_behavior: "always_invoice",
          },
        },
      });
    }

    const appUrl = new URL(request.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      configuration,
      return_url: `${appUrl}/pricing?billing=return`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (e: any) {
    console.error("portal error:", e);
    return NextResponse.json({ error: e.message ?? "エラーが発生しました" }, { status: 500 });
  }
}
