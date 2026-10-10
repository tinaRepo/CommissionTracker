import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "task-images";

export type DeleteResult =
  | { ok: true }
  | { ok: false; stage: "stripe" | "storage" | "auth"; error: unknown };

// {userId}/ 配下のファイルを再帰的に列挙（フォルダは id === null）
async function listUserFiles(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: 100, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const e of data) {
      const p = `${prefix}/${e.name}`;
      if (e.id === null) out.push(...(await listUserFiles(admin, p)));
      else out.push(p);
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

// Stripeのサブスクリプションを解約する（解約済み・存在しないものは無視）
async function cancelSubscriptions(stripe: Stripe, customerId: string | null, subscriptionId: string | null) {
  const ids = new Set<string>();
  if (subscriptionId) ids.add(subscriptionId);
  if (customerId) {
    // DBに記録が無くても、顧客に紐づく有効なサブスクをすべて解約する
    for (const status of ["active", "past_due", "trialing", "unpaid"] as const) {
      const list = await stripe.subscriptions.list({ customer: customerId, status, limit: 100 });
      list.data.forEach(s => ids.add(s.id));
    }
  }
  for (const id of ids) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch (e: any) {
      if (e?.code !== "resource_missing" && !/already been canceled/i.test(e?.message ?? "")) throw e;
    }
  }
}

// アカウントを完全に削除する（管理者による削除・本人による削除で共通）
//   1) Stripeのサブスク解約 → 2) Storage画像の削除 → 3) auth.users の削除（DBはcascade）
//   前段が失敗したら中断する（課金だけ残る・孤児ファイルが残る事故を防ぐ）
export async function deleteUserCompletely(admin: SupabaseClient, userId: string): Promise<DeleteResult> {
  const { data: target } = await admin
    .from("user_profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (target?.stripe_customer_id || target?.stripe_subscription_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      await cancelSubscriptions(stripe, target.stripe_customer_id, target.stripe_subscription_id);
    } catch (error) {
      return { ok: false, stage: "stripe", error };
    }
  }

  try {
    const files = await listUserFiles(admin, userId);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage.from(BUCKET).remove(files.slice(i, i + 100));
      if (error) throw error;
    }
  } catch (error) {
    return { ok: false, stage: "storage", error };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, stage: "auth", error };
  return { ok: true };
}
