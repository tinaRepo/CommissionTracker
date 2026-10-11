import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, getUserFromRequest } from "@/lib/server/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();
    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    // 許可した2つのPrice ID以外は拒否する（クライアントから任意のPriceを指定させない）
    const allowedPriceIds = [
      process.env.STRIPE_STANDARD_PRICE_ID,
      process.env.STRIPE_PREMIUM_PRICE_ID,
    ].filter((id): id is string => !!id);
    if (!allowedPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "invalid priceId" }, { status: 400 });
    }

    // 認証チェック
    const admin = createAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 既存のstripe_customer_idを取得
    const { data: profile } = await admin
      .from("user_profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    // すでに有料プランの場合はポータルへ
    if (profile?.plan === "standard" || profile?.plan === "premium") {
      return NextResponse.json({ error: "already_subscribed" }, { status: 400 });
    }

    let customerId = profile?.stripe_customer_id;

    // Stripeカスタマーがなければ作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    // チェックアウトセッション作成
    //   payment_method_types は指定しない（Stripeダッシュボードの「支払い方法」設定に従う動的な支払い方法）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      locale: "ja",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("checkout error:", e);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
