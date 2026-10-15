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

    const portalConfiguration = await stripe.billingPortal.configurations.retrieve(configuration);
    if (
      portalConfiguration.features.subscription_cancel.enabled ||
      !portalConfiguration.features.subscription_update.enabled ||
      portalConfiguration.features.subscription_update.proration_behavior !== "always_invoice"
    ) {
      console.error("Stripe billing portal configuration must disable cancellation and enable immediate prorated plan updates");
      return NextResponse.json(
        { error: "プラン管理の設定が未完了です。サポートへお問い合わせください。" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      configuration,
      return_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (e: any) {
    console.error("portal error:", e);
    return NextResponse.json({ error: e.message ?? "エラーが発生しました" }, { status: 500 });
  }
}
