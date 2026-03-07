"use client";

import { useState, useEffect } from "react";
import {
  supabase, adminFetchAllUsers, adminUpdateUserPlan,
  PLAN_LIMITS, type UserProfile, type Plan,
} from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PLANS: Plan[] = ["free", "standard", "premium"];

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | Plan>("all");
  const [toast, setToast] = useState<string | null>(null);

  // メールアドレスをauth.usersから取得する（管理者のみ可能）
  const [emails, setEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    // まずログインチェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    // 管理者チェック
    const { data: prof } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single();
    if (!prof?.is_admin) {
      window.location.href = "/";
      return;
    }
    await loadUsers();
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await adminFetchAllUsers();
      setUsers(data);

      // メールアドレスをauth APIから取得（Service Role Keyが必要なため、
      // ここではuser_idをそのまま表示する簡易実装）
      // 本番ではAPI Route経由でService Role Keyを使って取得することを推奨
    } catch (e) {
      setError("ユーザー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChange(userId: string, newPlan: Plan) {
    setUpdating(userId);
    try {
      await adminUpdateUserPlan(userId, newPlan);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      showToast("プランを更新しました ✓");
    } catch {
      showToast("更新に失敗しました ✗");
    } finally {
      setUpdating(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = users.filter(u => {
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    const matchSearch = !search || u.id.toLowerCase().includes(search.toLowerCase());
    return matchPlan && matchSearch;
  });

  const planCounts = PLANS.reduce((acc, p) => {
    acc[p] = users.filter(u => u.plan === p).length;
    return acc;
  }, {} as Record<Plan, number>);

  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5", fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>

      {/* Header */}
      <header style={{ background:"linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)",
        padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 4px 32px #0004" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => router.push("/")}
            style={{ background:"#ffffff18", border:"1px solid #ffffff30", color:"#c4b5fd",
              borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
            ← 戻る
          </button>
          <div>
            <div style={{ color:"#fff", fontSize:18, fontWeight:800 }}>⚙ 管理者ページ</div>
            <div style={{ color:"#c4b5fd", fontSize:11, marginTop:2 }}>ユーザーのプラン管理</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:16 }}>
          {PLANS.map(p => {
            const info = PLAN_LIMITS[p];
            return (
              <div key={p} style={{ textAlign:"center", background:"#ffffff12", borderRadius:10, padding:"8px 14px" }}>
                <div style={{ color:"#fff", fontSize:18, fontWeight:800 }}>{planCounts[p]}</div>
                <div style={{ fontSize:10, marginTop:2 }}>
                  <span style={{ background:info.bg, color:info.color, borderRadius:99, padding:"1px 8px", fontWeight:700 }}>
                    {info.label}
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ textAlign:"center", background:"#ffffff12", borderRadius:10, padding:"8px 14px" }}>
            <div style={{ color:"#fff", fontSize:18, fontWeight:800 }}>{users.length}</div>
            <div style={{ color:"#a78bfa", fontSize:10, marginTop:2 }}>合計</div>
          </div>
        </div>
      </header>

      <main style={{ padding:"24px 32px", maxWidth:900 }}>

        {/* フィルタ・検索 */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ユーザーIDで検索…"
            style={{ flex:1, minWidth:200, padding:"9px 12px", border:"1.5px solid #e5e7eb",
              borderRadius:10, fontSize:13, outline:"none", background:"#fff" }}
          />
          {[{ key:"all", label:"すべて" } as const, ...PLANS.map(p => ({ key: p, label: PLAN_LIMITS[p].label }))].map(s => (
            <button key={s.key} onClick={() => setFilterPlan(s.key as any)}
              style={{ background: filterPlan===s.key ? "#1a0a2e" : "#fff",
                color: filterPlan===s.key ? "#fff" : "#555",
                border:`1.5px solid ${filterPlan===s.key ? "#1a0a2e" : "#e5e7eb"}`,
                borderRadius:999, padding:"6px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {s.label}
            </button>
          ))}
          <button onClick={loadUsers}
            style={{ padding:"9px 16px", background:"#f3f4f6", border:"1.5px solid #e5e7eb",
              borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", color:"#555" }}>
            🔄 更新
          </button>
        </div>

        {error && (
          <div style={{ marginBottom:16, padding:"12px 16px", background:"#fee2e2", border:"1px solid #fca5a5",
            borderRadius:12, color:"#b91c1c", fontSize:13 }}>⚠ {error}</div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", color:"#7c3aed", fontSize:15, marginTop:60 }}>読み込み中…</div>
        ) : (
          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 6px #0001,0 2px 12px #0001" }}>
            {/* テーブルヘッダー */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 200px 100px",
              padding:"12px 20px", background:"#f8f7ff", borderBottom:"1px solid #e5e7eb",
              fontSize:11, fontWeight:700, color:"#888", letterSpacing:"0.06em" }}>
              <span>ユーザーID</span>
              <span>現在のプラン</span>
              <span>プランを変更</span>
              <span>登録日</span>
            </div>

            {filtered.length === 0 && (
              <div style={{ padding:"40px", textAlign:"center", color:"#aaa" }}>ユーザーが見つかりません</div>
            )}

            {filtered.map((u, i) => {
              const planInfo = PLAN_LIMITS[u.plan];
              const isUpdating = updating === u.id;
              const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString("ja-JP") : "—";
              return (
                <div key={u.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 200px 100px",
                  padding:"14px 20px", borderBottom: i < filtered.length-1 ? "1px solid #f3f4f6" : "none",
                  alignItems:"center", background: u.is_admin ? "#faf5ff" : "#fff",
                  transition:"background 0.1s" }}
                  onMouseEnter={e => { if (!u.is_admin) (e.currentTarget as HTMLDivElement).style.background="#faf8f5"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = u.is_admin ? "#faf5ff" : "#fff"; }}>

                  {/* ユーザーID */}
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%",
                      background:`linear-gradient(135deg, ${planInfo.color}40, ${planInfo.color}20)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:800, color:planInfo.color, flexShrink:0 }}>
                      {u.id.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"#666", fontFamily:"monospace",
                        maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {u.id}
                      </div>
                      {u.is_admin && (
                        <span style={{ fontSize:10, background:"#ede9fe", color:"#7c3aed",
                          borderRadius:99, padding:"1px 6px", fontWeight:700 }}>管理者</span>
                      )}
                    </div>
                  </div>

                  {/* 現在のプラン */}
                  <div>
                    <span style={{ background:planInfo.bg, color:planInfo.color,
                      border:`1px solid ${planInfo.color}40`, borderRadius:999,
                      padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                      {planInfo.label}
                    </span>
                    <div style={{ fontSize:10, color:"#aaa", marginTop:3 }}>
                      {planInfo.imageLimit === null ? "無制限" : `〜${planInfo.imageLimit}枚`}
                    </div>
                  </div>

                  {/* プラン変更 */}
                  <div style={{ display:"flex", gap:4 }}>
                    {PLANS.filter(p => p !== u.plan).map(p => {
                      const info = PLAN_LIMITS[p];
                      return (
                        <button key={p} onClick={() => handlePlanChange(u.id, p)}
                          disabled={isUpdating}
                          style={{ padding:"5px 10px", fontSize:11, fontWeight:700,
                            background: isUpdating ? "#f3f4f6" : info.bg,
                            color: isUpdating ? "#aaa" : info.color,
                            border:`1px solid ${isUpdating ? "#e5e7eb" : info.color}40`,
                            borderRadius:8, cursor: isUpdating ? "not-allowed" : "pointer",
                            transition:"opacity 0.15s" }}>
                          {isUpdating ? "…" : info.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 登録日 */}
                  <div style={{ fontSize:12, color:"#888" }}>{regDate}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* プラン説明 */}
        <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {PLANS.map(p => {
            const info = PLAN_LIMITS[p];
            return (
              <div key={p} style={{ background:"#fff", borderRadius:14, padding:"16px 18px",
                border:`1.5px solid ${info.color}30`, boxShadow:"0 1px 6px #0001" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ background:info.bg, color:info.color, borderRadius:99,
                    padding:"3px 12px", fontSize:12, fontWeight:800 }}>{info.label}</span>
                </div>
                <div style={{ fontSize:13, color:"#555" }}>
                  画像保存: <strong style={{ color:info.color }}>
                    {info.imageLimit === null ? "無制限" : `合計${info.imageLimit}枚まで`}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* トースト通知 */}
      {toast && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
          background:"#1a0a2e", color:"#fff", padding:"12px 24px", borderRadius:12,
          fontSize:13, fontWeight:700, boxShadow:"0 4px 20px #0004", zIndex:999,
          animation:"fadeIn 0.2s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
