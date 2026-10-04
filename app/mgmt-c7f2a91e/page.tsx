"use client";

import { useState, useEffect } from "react";
import {
  supabase, adminFetchAllUsers, adminUpdateUserPlan, adminDeleteUser,
  PLAN_LIMITS, type UserProfile, type Plan,
} from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Icon, cx } from "@/components/TaskShared";

const PLANS: Plan[] = ["free", "standard", "premium"];

// 管理者ページ
export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | Plan>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  // 管理者かどうかを確認し、ユーザー一覧とメンテナンス設定を読み込む
  async function checkAdminAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const { data: prof } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single();
    if (!prof?.is_admin) {
      window.location.href = "/";
      return;
    }
    await loadMaintenanceSettings();
    await loadUsers();
  }

  // メンテナンス設定を読み込む
  async function loadMaintenanceSettings() {
    setMaintenanceLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("maintenance_enabled, maintenance_message")
      .eq("setting_key", "maintenance")
      .maybeSingle();
    if (error || !data) {
      setError("メンテナンス設定を読み込めませんでした。DBマイグレーションの適用状況を確認してください。");
    } else {
      setMaintenanceEnabled(data.maintenance_enabled);
      setMaintenanceMessage(data.maintenance_message ?? "");
    }
    setMaintenanceLoading(false);
  }

  // メンテナンス設定を保存する
  async function saveMaintenanceSettings(enabled: boolean) {
    setMaintenanceSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("app_settings")
      .update({
        maintenance_enabled: enabled,
        maintenance_message: maintenanceMessage.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", "maintenance")
      .select("maintenance_enabled, maintenance_message")
      .maybeSingle();

    if (error || !data) {
      setError(error?.message ?? "メンテナンス設定を保存できませんでした");
    } else {
      setMaintenanceEnabled(data.maintenance_enabled);
      setMaintenanceMessage(data.maintenance_message ?? "");
      showToast(data.maintenance_enabled ? "メンテナンスを開始しました" : "メンテナンスを終了しました");
    }
    setMaintenanceSaving(false);
  }

  // ユーザー一覧を読み込む
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

  // ユーザーのプランを変更する
  async function handlePlanChange(userId: string, newPlan: Plan) {
    setUpdating(userId);
    try {
      await adminUpdateUserPlan(userId, newPlan);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      showToast("プランを更新しました");
    } catch {
      showToast("更新に失敗しました");
    } finally {
      setUpdating(null);
    }
  }

  // トースト通知を表示する
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // ユーザーを削除する
  async function handleDeleteUser(userId: string) {
    setDeleting(true);
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      showToast("ユーザーを削除しました");
    } catch (e: any) {
      showToast(e.message ?? "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  // フィルタリングされたユーザー一覧を計算する
  const filtered = users.filter(u => {
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      u.id.toLowerCase().includes(searchLower) ||
      (u.display_name ?? "").toLowerCase().includes(searchLower);
    return matchPlan && matchSearch;
  });

  // プランごとのユーザー数を計算する
  const planCounts = PLANS.reduce((acc, p) => {
    acc[p] = users.filter(u => u.plan === p).length;
    return acc;
  }, {} as Record<Plan, number>);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>

      {/* Header */}
      <header className="doc-header" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 10 }}>
            <button onClick={() => window.location.href = "/"} className="doc-back-btn">← 戻る</button>
            <div>
              <div className="title">管理者ページ</div>
              <div className="text-meta" style={{ color: "var(--muted-on-inverse)" }}>ユーザーのプラン管理</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => router.push("/mgmt-c7f2a91e/notifications")} className="btn btn-inverse-outline btn-sm">
              お知らせ管理
            </button>
            <button onClick={loadUsers} className="icon-btn"><Icon name="settings" size={15} /></button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[...PLANS.map(p => ({ key: p, count: planCounts[p], label: PLAN_LIMITS[p].label })),
          { key: "total", count: users.length, label: "合計" }
          ].map(s => (
            <div key={s.key} className="stat-block" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-md)", padding: "8px 4px" }}>
              <div className="stat-value">{s.count}</div>
              <div className="stat-label" style={{ marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <main className="container-narrow" style={{ padding: 16, maxWidth: 640 }}>

        {/* メンテナンス設定 */}
        <section className="card" style={{ padding: 16, marginBottom: 18, borderColor: maintenanceEnabled ? "var(--danger)" : undefined }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>メンテナンスモード</h2>
              <div style={{ marginTop: 4, color: maintenanceEnabled ? "var(--danger)" : "var(--success)", fontSize: 12, fontWeight: 700 }}>
                {maintenanceLoading ? "設定を読み込み中…" : maintenanceEnabled ? "有効: 利用者のアクセスを停止中" : "無効: 通常公開中"}
              </div>
            </div>
            <button
              type="button"
              disabled={maintenanceLoading || maintenanceSaving}
              onClick={() => saveMaintenanceSettings(!maintenanceEnabled)}
              className={cx("btn", "btn-sm", maintenanceEnabled ? "btn-secondary" : "btn-danger-solid")}
              style={{ flexShrink: 0 }}
            >
              {maintenanceSaving ? "保存中…" : maintenanceEnabled ? "メンテ終了" : "開始する"}
            </button>
          </div>
          <p className="text-muted" style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.6 }}>
            有効にすると管理者以外にはメンテナンス画面を表示します。管理者は引き続き管理画面を操作できます。
          </p>
          <textarea
            value={maintenanceMessage}
            onChange={e => setMaintenanceMessage(e.target.value)}
            maxLength={500}
            placeholder="利用者向けのお知らせ（任意）"
            rows={3}
            disabled={maintenanceLoading || maintenanceSaving}
            className="textarea"
          />
          <div className="row" style={{ justifyContent: "space-between", gap: 10, marginTop: 6 }}>
            <span className="text-meta">{maintenanceMessage.length}/500</span>
            <button type="button" disabled={maintenanceLoading || maintenanceSaving}
              onClick={() => saveMaintenanceSettings(maintenanceEnabled)} className="btn btn-secondary btn-sm">
              案内文を保存
            </button>
          </div>
        </section>

        {/* 検索・フィルタ */}
        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前 / IDで検索…" className="input" />
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {[{ key: "all", label: "すべて" } as const, ...PLANS.map(p => ({ key: p, label: PLAN_LIMITS[p].label }))].map(s => (
              <button key={s.key} onClick={() => setFilterPlan(s.key as any)}
                className={cx("btn", "btn-sm", filterPlan === s.key ? "btn-primary" : "btn-secondary")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--danger-soft)", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--accent)", fontSize: 15, marginTop: 60 }}>読み込み中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--meta)", marginTop: 60 }}>ユーザーが見つかりません</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(u => {
              const planInfo = PLAN_LIMITS[u.plan];
              const isUpdating = updating === u.id;
              const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString("ja-JP") : "—";
              return (
                <div key={u.id} className="card" style={{ padding: "14px 16px", background: u.is_admin ? "var(--accent-soft)" : undefined }}>

                  <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700,
                    }}>
                      {(u.display_name ?? u.id).charAt(0).toUpperCase()}
                    </div>
                    <div className="grow">
                      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>
                          {u.display_name ?? <span className="text-meta" style={{ fontStyle: "italic" }}>未設定</span>}
                        </span>
                        {u.is_admin && <span className="badge badge-accent">管理者</span>}
                        <span className="badge" style={{ background: "var(--surface-2)", color: "var(--fg-2)" }}>{planInfo.label}</span>
                      </div>
                      <div className="text-meta" style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.id}</div>
                      <div className="text-meta" style={{ marginTop: 1 }}>登録: {regDate}</div>
                      {u.last_sign_in_at && (
                        <div className="text-meta" style={{ marginTop: 1 }}>最終ログイン: {new Date(u.last_sign_in_at).toLocaleString("ja-JP")}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="field-label" style={{ marginBottom: 6 }}>プランを変更</div>
                    <div className="row" style={{ gap: 6 }}>
                      {PLANS.map(p => {
                        const info = PLAN_LIMITS[p];
                        const isCurrent = u.plan === p;
                        return (
                          <button key={p} onClick={() => !isCurrent && !isUpdating && handlePlanChange(u.id, p)}
                            disabled={isUpdating}
                            className={cx("btn", "btn-sm", isCurrent ? "btn-primary" : "btn-secondary")}
                            style={{ flex: 1, flexDirection: "column", lineHeight: 1.3, padding: "9px 4px" }}>
                            {isUpdating ? "…" : info.label}
                            {isCurrent && <span style={{ fontSize: 9, opacity: 0.8 }}>現在</span>}
                          </button>
                        );
                      })}
                      {!u.is_admin && (
                        <button onClick={() => setDeleteConfirm(u.id)} className="icon-btn"
                          style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "none" }}>
                          <Icon name="trash" size={15} />
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
              <div key={p} className="card" style={{ padding: 12 }}>
                <span className="badge" style={{ background: "var(--surface-2)", color: "var(--fg-2)" }}>{info.label}</span>
                <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                  {info.imageLimit === null ? "無制限" : `${info.imageLimit}枚`}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {deleteConfirm && (() => {
        const target = users.find(u => u.id === deleteConfirm);
        const name = target?.display_name ?? deleteConfirm.slice(0, 8) + "...";
        return (
          <div className="modal-overlay">
            <div className="modal-compact" style={{ maxWidth: 360 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>ユーザーを削除しますか？</div>
              <div style={{ fontSize: 14, color: "var(--danger)", fontWeight: 700, marginBottom: 8 }}>「{name}」</div>
              <div className="text-muted" style={{ fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                すべてのタスクデータ・画像が<strong style={{ color: "var(--fg)" }}>完全に削除されます。取り消せません。</strong>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
                <button onClick={() => handleDeleteUser(deleteConfirm)} disabled={deleting} className="btn btn-danger-solid" style={{ flex: 1 }}>
                  {deleting ? "削除中…" : "削除する"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
