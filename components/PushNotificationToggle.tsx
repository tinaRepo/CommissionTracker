"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Web Push通知の購読管理コンポーネント
export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // コンポーネントマウント時にService WorkerとPush APIのサポートを確認し、既存の購読状態をチェック
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      checkSubscription();
    }
  }, []);

  // 既存の購読状態を確認する関数
  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (e) {
      console.error("check subscription error:", e);
    }
  }

  // 購読の切り替え処理
  async function handleToggle() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      if (subscribed) {
        // 解除
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        });
        setSubscribed(false);
      } else {
        // 購読
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("通知の許可が必要です。ブラウザの設定から許可してください。");
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub }),
        });
        setSubscribed(true);
      }
    } catch (e: any) {
      console.error("toggle error:", e);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <button onClick={handleToggle} disabled={loading}
      style={{
        width: "100%", padding: "11px 16px", background: "none", border: "none",
        borderBottom: "1px solid #f3f4f6", cursor: loading ? "not-allowed" : "pointer",
        fontSize: 13, color: subscribed ? "#10b981" : "#1a0a2e",
        fontWeight: 600, textAlign: "left",
      }}>
      {loading ? "処理中…" : subscribed ? "🔔 通知オン（タップでオフ）" : "🔕 通知オフ（タップでオン）"}
    </button>
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
