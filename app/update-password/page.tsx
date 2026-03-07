"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpdate() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 55%,#1a2a4a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", padding: 16,
    }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px #0006" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>🔐</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e" }}>新しいパスワードを設定</div>
        </div>
        {message && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
            {message}
          </div>
        )}
        <input
          type="password" placeholder="新しいパスワード（6文字以上）"
          value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: 14, outline: "none", color: "#1a0a2e", background: "#faf8f5", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 14 }}
        />
        <button
          onClick={handleUpdate}
          disabled={loading || password.length < 6}
          style={{
            width: "100%", padding: "12px",
            background: (loading || password.length < 6) ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", border: "none", borderRadius: 12,
            fontWeight: 800, fontSize: 15, cursor: "pointer",
          }}
        >
          {loading ? "更新中…" : "パスワードを更新"}
        </button>
      </div>
    </div>
  );
}
