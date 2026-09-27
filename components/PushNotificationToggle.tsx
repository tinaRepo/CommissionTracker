"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Web Push通知の購読管理コンポーネント
export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // コンポーネントマウント時にService WorkerとPush APIのサポートを確認し、既存の購読状態をチェック
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setLoading(true);
      navigator.serviceWorker.register("/sw.js")
        .then(async registration => {
          const sub = await registration.pushManager.getSubscription();
          if (sub) await saveSubscription(sub);
          setSubscribed(!!sub);
          setErrorMessage(null);
        })
        .catch(e => {
          console.error("service worker registration error:", e);
          setSubscribed(false);
          setErrorMessage(e instanceof Error ? e.message : "通知機能を初期化できませんでした。");
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // 購読情報をSupabaseに保存する
  async function saveSubscription(sub: PushSubscription) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("ログイン状態を確認できません。再ログインしてください。");

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ user_id: session.user.id, subscription: sub.toJSON() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "通知設定を保存できませんでした。");
  }

  // 購読情報をSupabaseから削除する
  async function removeSubscription() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("ログイン状態を確認できません。再ログインしてください。");

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id);
    if (error) throw new Error(error.message || "通知設定を解除できませんでした。");
  }

  // Service Workerの登録を取得する（未登録なら登録する）
  async function getPushRegistration() {
    return await navigator.serviceWorker.getRegistration("/")
      ?? await navigator.serviceWorker.register("/sw.js");
  }

  // 購読の切り替え処理
  async function handleToggle() {
    setLoading(true);
    try {
      if (subscribed) {
        // 解除
        const reg = await getPushRegistration();
        const sub = await reg.pushManager.getSubscription();
        await removeSubscription();
        if (sub) await sub.unsubscribe();
        setSubscribed(false);
      } else {
        // 購読
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("通知の許可が必要です。ブラウザの設定から許可してください。");
          return;
        }

        const reg = await getPushRegistration();
        const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });

        await saveSubscription(sub);
        setSubscribed(true);
      }
      setErrorMessage(null);
    } catch (e: any) {
      console.error("toggle error:", e);
      setErrorMessage(e.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div>
      <button onClick={handleToggle} disabled={loading}
        style={{
          width: "100%", padding: "11px 16px", background: "none", border: "none",
          borderBottom: errorMessage ? "none" : "1px solid #f3f4f6", cursor: loading ? "not-allowed" : "pointer",
          fontSize: 13, color: subscribed ? "#10b981" : "#1a0a2e",
          fontWeight: 600, textAlign: "left",
        }}>
        {loading ? "処理中…" : subscribed ? "🔔 通知オン（タップでオフ）" : "🔕 通知オフ（タップでオン）"}
      </button>
      {errorMessage && (
        <div role="alert" style={{ padding: "0 16px 10px", color: "#b91c1c", fontSize: 11, lineHeight: 1.5 }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// VAPID公開鍵をUint8Arrayに変換するユーティリティ関数
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
