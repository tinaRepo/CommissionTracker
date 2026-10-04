"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Web Push通知の購読管理コンポーネント
export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  async function saveSubscription(sub: PushSubscription) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("ログイン状態を確認できません。再ログインしてください。");

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ user_id: session.user.id, subscription: sub.toJSON() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "通知設定を保存できませんでした。");
  }

  async function removeSubscription() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("ログイン状態を確認できません。再ログインしてください。");

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id);
    if (error) throw new Error(error.message || "通知設定を解除できませんでした。");
  }

  async function getPushRegistration() {
    return await navigator.serviceWorker.getRegistration("/")
      ?? await navigator.serviceWorker.register("/sw.js");
  }

  async function handleToggle() {
    setLoading(true);
    try {
      if (subscribed) {
        const reg = await getPushRegistration();
        const sub = await reg.pushManager.getSubscription();
        await removeSubscription();
        if (sub) await sub.unsubscribe();
        setSubscribed(false);
      } else {
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
      <button onClick={handleToggle} disabled={loading} className="user-menu-item"
        style={{ color: subscribed ? "var(--success)" : "var(--fg)" }}>
        {loading ? "処理中…" : subscribed ? "通知オン（タップでオフ）" : "通知オフ（タップでオン）"}
      </button>
      {errorMessage && (
        <div role="alert" style={{ padding: "0 16px 10px", color: "var(--danger)", fontSize: 11, lineHeight: 1.5 }}>
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
