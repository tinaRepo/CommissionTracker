"use client";

import type { TaskStatus, ImageType } from "@/lib/supabase";

// ============================================================
// TaskApp（本番）とDemoApp（ログイン不要のデモ）の両方で使う
// 定数・フォーマッタ・見た目に関する小さなUI部品をここに集約する。
//
// 見た目は app/globals.css・app/components.css で定義した
// デザイントークン／共通クラスのみを組み合わせて作る。色や余白を
// ここでハードコードしない（ステータスごとの色は components.css の
// .badge-* クラス側で定義し、ここではクラス名の対応表だけを持つ）。
// ============================================================

// ---- ステータス定義 ----
// pending: 依頼済み / checking: 確認中（旧ラフ確認中） / progress: 対応中 / done: 完成 / cancelled: キャンセル
export const STATUSES: { key: TaskStatus; label: string; badgeClass: string }[] = [
  { key: "pending", label: "依頼済み", badgeClass: "badge-pending" },
  { key: "checking", label: "確認中", badgeClass: "badge-checking" },
  { key: "progress", label: "対応中", badgeClass: "badge-progress" },
  { key: "done", label: "完成", badgeClass: "badge-done" },
  { key: "cancelled", label: "キャンセル", badgeClass: "badge-cancelled" },
];

// ---- 画像タイプのラベル ----
// preview: 確認用（旧ラフ） / wip: 作業中 / finished: 完成 / other: その他
export const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: "preview", label: "確認用" }, { key: "wip", label: "作業中" },
  { key: "finished", label: "完成" }, { key: "other", label: "その他" },
];

// --- 日付を "YYYY/MM/DD" 形式にフォーマット ---
export function fmtDate(d?: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${y}/${m}/${day}`;
}

// --- 金額をフォーマット（例: "12,000 円"） ---
export function fmtPrice(price?: number, currency?: string) {
  if (!price) return "—";
  return `${price.toLocaleString()} 円`;
}

// --- 締切までの日数を計算 ---
export function daysUntil(d?: string) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, day] = d.split("-").map(Number);
  const deadline = new Date(y, m - 1, day);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

// --- 一覧カードなど省スペースな箇所向けの短い日付フォーマット（例: "09/25"） ---
export function fmtShortDate(d?: string) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length < 3) return d;
  return `${parts[1]}/${parts[2]}`;
}

// --- クラス名を結合する小さなヘルパー ---
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// --- ラベル付きフィールドのラッパー ---
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">
        {label.endsWith(" *") ? <>{label.slice(0, -2)} <span className="field-required">*</span></> : label}
      </label>
      {children}
    </div>
  );
}

// --- 日付入力フィールド（単一の日付＋クリアボタン） ---
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="row" style={{ gap: 6 }}>
        <input type="date" value={value} onChange={e => onChange(e.target.value)}
          className="input input-date" style={{ flex: 1 }} />
        {value && (
          <button type="button" onClick={() => onChange("")} className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0, padding: "9px 12px" }} aria-label="日付をクリア">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
    </Field>
  );
}

// --- 日付レンジ（From〜To）入力フィールド：詳細検索パネル用 ---
export function DateRangeField({ label, from, to, onFromChange, onToChange }: {
  label: string; from: string; to: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="row" style={{ gap: 6 }}>
        <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
          className="input input-date" style={{ flex: 1 }} />
        <span className="text-meta" style={{ flexShrink: 0 }}>〜</span>
        <input type="date" value={to} onChange={e => onToChange(e.target.value)}
          className="input input-date" style={{ flex: 1 }} />
      </div>
    </Field>
  );
}

// ============================================================
// --- 最小限のラインアイコン ---
// ============================================================
// 絵文字・記号文字（✓ ← › ▾ × ＋ など）を並べるとAI生成物特有の見た目になりやすいため、
// ナビゲーションやボタンのアイコンはここで定義する軽量なSVGパスのみを使う。
// 新しいアイコンが必要な場合もここに追加する（24x24 viewBox・線幅1.7のストローク前提）。
// ※ Googleの「G」はブランドロゴのため線アイコンではなく、下の GoogleLogo（公式SVG）を使う。
const ICON_PATHS = {
  // ---- 既存 ----
  bell: "M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4c-.3-.4-.5-.9-.5-1.4V8a5 5 0 0 0-5-5Z M9.5 18a2.5 2.5 0 0 0 5 0",
  mail: "M4 6h16v12H4z M4 6l8 7 8-7",
  plus: "M12 5v14 M5 12h14",
  chevronDown: "M6 9l6 6 6-6",
  close: "M6 6l12 12 M18 6L6 18",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  key: "M14.5 9.5a3.5 3.5 0 1 1-4.95 4.95L4 20v-3l1.5-1.5H8v-2h2v-2l1.55-1.55A3.5 3.5 0 0 1 14.5 9.5Z",
  link: "M9 15l6-6 M10 7l1-1a3.5 3.5 0 0 1 5 5l-1 1 M14 17l-1 1a3.5 3.5 0 0 1-5-5l1-1",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.5 6.5l1.4 1.4 M16.1 16.1l1.4 1.4 M6.5 17.5l1.4-1.4 M16.1 7.9l1.4-1.4",
  camera: "M4 8h3l2-2h6l2 2h3v11H4z M12 12.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  download: "M12 4v11 M7 11l5 5 5-5 M5 19h14",
  edit: "M4 20h4l10-10-4-4L4 16v4Z M13 6l4 4",
  check: "M5 12l5 5 9-9",
  users: "M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M2 20a6 6 0 0 1 12 0 M17 13a3 3 0 1 0 0-6 M22 20a5.5 5.5 0 0 0-5-5.5",

  // ---- v2.0.0で追加（記号文字・絵文字の置き換え用） ----
  arrowLeft: "M19 12H5 M11 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronUp: "M6 15l6-6 6 6",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7 M20 4v5h-5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M20 20l-4-4",
  filter: "M4 6h16 M7 12h10 M10 18h4",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  image: "M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M9 9.5h.01",
  logout: "M10 4H5v16h5 M15 8l4 4-4 4 M19 12H9",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 20a8 8 0 0 1 16 0",
  lock: "M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3",
  alert: "M12 4l9 16H3L12 4Z M12 10v4 M12 17h.01",
} satisfies Record<string, string>;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// --- Googleのブランドロゴ（公式の4色G。線アイコンではなくブランドロゴのためここだけ多色） ---
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// --- ステータスバッジ ---
export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return <span className={cx("badge", s.badgeClass)}>{s.label}</span>;
}

// ============================================================
// --- タスク一覧カード（TaskApp・DemoApp共通） ---
// ============================================================
export function TaskListCard({
  title, assigneeName, contact, status, deadline, price, imageCount, thumbnailUrl, tags, onClick,
}: {
  title: string;
  assigneeName: string;
  contact?: string;
  status: TaskStatus;
  deadline?: string;
  price?: number;
  imageCount: number;
  thumbnailUrl?: string;
  tags?: { id: string; name: string }[];
  onClick: () => void;
}) {
  const days = daysUntil(deadline);
  const urgent = days !== null && days <= 7 && status !== "done" && status !== "cancelled";

  return (
    <div
      onClick={onClick}
      className={cx("card", "card-interactive", urgent && "card-urgent")}
      style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}
    >
      {/* サムネイル＋画像枚数バッジ */}
      {imageCount > 0 && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="thumbnail"
              style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-soft)", display: "block" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "var(--surface-2)" }} />
          )}
          <span className="tag" style={{ position: "absolute", bottom: -5, right: -5 }}>
            {imageCount}
          </span>
        </div>
      )}

      <div className="grow">
        {/* 1行目: タイトル＋ステータス */}
        <div className="row" style={{ gap: 8, marginBottom: 5 }}>
          <span className="grow" style={{
            fontWeight: 600, fontSize: 15, color: "var(--fg)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {title}
          </span>
          <span style={{ flexShrink: 0 }}><StatusBadge status={status} /></span>
        </div>
        {/* 2行目: 依頼先名（省略可）＋納期（常に表示） */}
        <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--muted)" }}>
          <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {assigneeName}{contact && <span style={{ color: "var(--accent)", marginLeft: 4 }}>{contact}</span>}
          </span>
          <span style={{ flexShrink: 0, fontWeight: 600, color: urgent ? "var(--danger)" : "var(--meta)" }}>
            納期 {fmtShortDate(deadline)}
          </span>
        </div>
        {/* 3行目: タグ（あるときだけ。最大3つ + 残り件数） */}
        {tags && tags.length > 0 && (
          <div className="row" style={{ gap: 4, marginTop: 6, overflow: "hidden" }}>
            {tags.slice(0, 3).map(t => <span key={t.id} className="tag-pill">{t.name}</span>)}
            {tags.length > 3 && <span className="text-meta" style={{ flexShrink: 0 }}>+{tags.length - 3}</span>}
          </div>
        )}
      </div>

      {/* 金額・納期カウントダウン */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: "var(--fg)" }}>{fmtPrice(price)}</div>
        {days !== null && status !== "done" && status !== "cancelled" && (
          <div style={{
            fontSize: 10, fontWeight: 600, marginTop: 2,
            color: days < 0 ? "var(--danger)" : days <= 7 ? "var(--warn)" : "var(--meta)"
          }}>
            {days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? "本日納期" : `残${days}日`}
          </div>
        )}
      </div>
    </div>
  );
}
