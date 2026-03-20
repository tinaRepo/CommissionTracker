"use client";

import { useState, useEffect } from "react";
import {
  supabase, adminFetchAllUsers, adminUpdateUserPlan, adminDeleteUser,
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // 削除確認対象のuserId
  const [deleting, setDeleting] = useState(false);

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

  async function handleDeleteUser(userId: string) {
    setDeleting(true);
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      showToast("ユーザーを削除しました ✓");
    } catch (e: any) {
      showToast(e.message ?? "削除に失敗しました ✗");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = users.filter(u => {
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      u.id.toLowerCase().includes(searchLower) ||
      (u.display_name ?? "").toLowerCase().includes(searchLower);
    return matchPlan && matchSearch;
  });

  const planCounts = PLANS.reduce((acc, p) => {
    acc[p] = users.filter(u => u.plan === p).length;
    return acc;
  }, {} as Record<Plan, number>);

  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5", fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "16px 20px", boxShadow: "0 4px 32px #0004" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => window.location.href = "/"}
              style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              ← 戻る
            </button>
            <div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>⚙ 管理者ページ</div>
              <div style={{ color: "#c4b5fd", fontSize: 11 }}>ユーザーのプラン管理</div>
            </div>
          </div>
          <button onClick={loadUsers}
            style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
            🔄
          </button>
        </div>
        {/* プラン統計 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[...PLANS.map(p => ({ key: p, count: planCounts[p], label: PLAN_LIMITS[p].label, color: PLAN_LIMITS[p].color, bg: PLAN_LIMITS[p].bg })),
            { key: "total", count: users.length, label: "合計", color: "#a78bfa", bg: "#ede9fe" }
          ].map(s => (
            <div key={s.key} style={{ textAlign: "center", background: "#ffffff12", borderRadius: 10, padding: "8px 4px" }}>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{s.count}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: "1px 6px", fontWeight: 700 }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      <main style={{ padding: "16px", maxWidth: 640, margin: "0 auto" }}>

        {/* 検索・フィルタ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="名前 / IDで検索…"
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ key: "all", label: "すべて" } as const, ...PLANS.map(p => ({ key: p, label: PLAN_LIMITS[p].label }))].map(s => (
              <button key={s.key} onClick={() => setFilterPlan(s.key as any)}
                style={{ background: filterPlan === s.key ? "#1a0a2e" : "#fff", color: filterPlan === s.key ? "#fff" : "#555", border: `1.5px solid ${filterPlan === s.key ? "#1a0a2e" : "#e5e7eb"}`, borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, color: "#b91c1c", fontSize: 13 }}>⚠ {error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", color: "#7c3aed", fontSize: 15, marginTop: 60 }}>読み込み中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", marginTop: 60 }}>ユーザーが見つかりません</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(u => {
              const planInfo = PLAN_LIMITS[u.plan];
              const isUpdating = updating === u.id;
              const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString("ja-JP") : "—";
              return (
                <div key={u.id} style={{ background: u.is_admin ? "#faf5ff" : "#fff", borderRadius: 14, padding: "14px 16px", border: `1.5px solid ${u.is_admin ? "#ede9fe" : "#f0f0f0"}`, boxShadow: "0 1px 6px #0001" }}>

                  {/* ユーザー情報 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${planInfo.color}40,${planInfo.color}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: planInfo.color }}>
                      {(u.display_name ?? u.id).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a0a2e" }}>
                          {u.display_name ?? <span style={{ color: "#aaa", fontStyle: "italic" }}>未設定</span>}
                        </span>
                        {u.is_admin && <span style={{ fontSize: 10, background: "#ede9fe", color: "#7c3aed", borderRadius: 99, padding: "1px 6px", fontWeight: 700 }}>管理者</span>}
                        <span style={{ background: planInfo.bg, color: planInfo.color, border: `1px solid ${planInfo.color}40`, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{planInfo.label}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#bbb", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.id}</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>登録: {regDate}</div>
                    </div>
                  </div>

                  {/* プラン変更 + 削除 */}
                  <div>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 6 }}>プランを変更</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {PLANS.map(p => {
                        const info = PLAN_LIMITS[p];
                        const isCurrent = u.plan === p;
                        return (
                          <button key={p} onClick={() => !isCurrent && !isUpdating && handlePlanChange(u.id, p)}
                            disabled={isUpdating}
                            style={{ flex: 1, padding: "9px 4px", fontSize: 12, fontWeight: 700,
                              background: isCurrent ? info.bg : "#fff",
                              color: isCurrent ? info.color : "#777",
                              border: `1.5px solid ${isCurrent ? info.color : "#e5e7eb"}`,
                              borderRadius: 10, cursor: isCurrent || isUpdating ? "default" : "pointer",
                              transition: "all 0.15s", lineHeight: 1.3 }}>
                            {isUpdating ? "…" : info.label}
                            {isCurrent && <span style={{ fontSize: 9, display: "block", opacity: 0.6 }}>現在</span>}
                          </button>
                        );
                      })}
                      {!u.is_admin && (
                        <button onClick={() => setDeleteConfirm(u.id)}
                          style={{ padding: "9px 12px", fontSize: 14, background: "#fff0f0", color: "#ef4444", border: "1.5px solid #fca5a560", borderRadius: 10, cursor: "pointer" }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* プラン説明 */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {PLANS.map(p => {
            const info = PLAN_LIMITS[p];
            return (
              <div key={p} style={{ background: "#fff", borderRadius: 12, padding: "12px", border: `1.5px solid ${info.color}30` }}>
                <span style={{ background: info.bg, color: info.color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>{info.label}</span>
                <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                  <strong style={{ color: info.color }}>{info.imageLimit === null ? "無制限" : `${info.imageLimit}枚`}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (() => {
        const target = users.find(u => u.id === deleteConfirm);
        const name = target?.display_name ?? deleteConfirm.slice(0, 8) + "...";
        return (
          <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", boxShadow: "0 8px 48px #0004", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#1a0a2e", marginBottom: 8 }}>ユーザーを削除しますか？</div>
              <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>「{name}」</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
                すべての依頼データ・画像が<br /><strong>完全に削除されます。取り消せません。</strong>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                  キャンセル
                </button>
                <button onClick={() => handleDeleteUser(deleteConfirm)} disabled={deleting}
                  style={{ flex: 1, background: deleting ? "#fca5a5" : "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 800, cursor: deleting ? "not-allowed" : "pointer", fontSize: 14 }}>
                  {deleting ? "削除中…" : "削除する"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
