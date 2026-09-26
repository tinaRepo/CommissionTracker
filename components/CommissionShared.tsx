"use client";

import type { CommissionStatus, ImageType } from "@/lib/supabase";

// ============================================================
// CommissionApp（本番）とDemoApp（ログイン不要のデモ）の両方で使う
// 定数・フォーマッタ・見た目に関する小さなUI部品をここに集約する。
//
// 一方で、画像アップロード（Supabase Storage・プラン制限）や
// 認証まわりはCommissionAppとDemoAppで実装の意味が本質的に異なる
// （本番はSupabase、デモは完全にメモリのみ）ため、無理にここへ
// 共通化しない。
// ============================================================

// ---- ステータス定義 ----
export const STATUSES: { key: CommissionStatus; label: string; color: string; bg: string }[] = [
  { key: "pending", label: "依頼済み", color: "#f59e0b", bg: "#fef3c7" },
  { key: "rough", label: "ラフ確認中", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "progress", label: "制作中", color: "#3b82f6", bg: "#dbeafe" },
  { key: "done", label: "完成", color: "#10b981", bg: "#d1fae5" },
  { key: "cancelled", label: "キャンセル", color: "#6b7280", bg: "#f3f4f6" },
];

// ---- 画像タイプのラベル ----
export const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: "rough", label: "ラフ" }, { key: "wip", label: "作業中" },
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
// 年込みの完全な日付は詳細モーダル側（fmtDate）でのみ表示し、
// 一覧カードでは月日のみにして横幅を圧縮する。
export function fmtShortDate(d?: string) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length < 3) return d;
  return `${parts[1]}/${parts[2]}`;
}

// --- テキストボックスのスタイル ---
export const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 16, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};

// --- 日付の入力フィールドスタイル ---
export const inp_date: React.CSSProperties = {
  minWidth: 0, padding: "9px 8px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 16, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};

// --- ラベル付きフィールドのラッパー ---
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

// --- 日付入力フィールド（単一の日付＋クリアボタン） ---
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inp_date, flex: 1 }} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{
              flexShrink: 0, background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 8,
              width: 32, height: 36, cursor: "pointer", fontSize: 14, color: "#888", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}>
            ×
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
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
          style={{ ...inp_date, flex: 1 }} />
        <span style={{ color: "#aaa", fontSize: 12, flexShrink: 0 }}>〜</span>
        <input type="date" value={to} onChange={e => onToChange(e.target.value)}
          style={{ ...inp_date, flex: 1 }} />
      </div>
    </Field>
  );
}

// --- ステータスバッジ ---
export function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
      borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
    }}>
      {s.label}
    </span>
  );
}

// ============================================================
// --- 依頼一覧カード（CommissionApp・DemoApp共通） ---
// ============================================================
// NOTE: 以前は「タイトル+ステータス+⚠バッジ+画像枚数」のヘッダー行と、
// 「絵師名・依頼日・納期・ラフ日」を横並びflexWrapで並べた行の2段構成で、
// 画面幅が狭いスマホだと折り返しが多発してカードが縦にとても長くなり、
// 画像がある場合は特に見づらくなっていた。
// 以下の方針でコンパクト化・視認性改善している。
//   - 画像枚数は独立したテキストではなく、サムネイルに重ねる小さいバッジにする
//   - ヘッダーの「⚠ あと0日」は、価格側に既にある納期カウントダウン
//     （残N日／今日が納期／N日超過）と意味が重複するため削除する
//   - 依頼日・ラフ日は一覧では省略し、詳細モーダル側でのみ表示する
//     （一覧で必要なのは「今どのステータスで、納期はいつか」が中心のため）
//   - 絵師名＋納期を1行に固定し、絵師名側だけ省略記号（…）で切り詰めることで、
//     より重要な納期が必ず見えるようにする
export function CommissionListCard({
  title, artist, xId, status, deadline, price, imageCount, thumbnailUrl, onClick,
}: {
  title: string;
  artist: string;
  xId?: string;
  status: CommissionStatus;
  deadline?: string;
  price?: number;
  imageCount: number;
  thumbnailUrl?: string;
  onClick: () => void;
}) {
  const days = daysUntil(deadline);
  const urgent = days !== null && days <= 7 && status !== "done" && status !== "cancelled";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 16, padding: "14px 16px",
        boxShadow: urgent ? "0 0 0 2px #ef444460,0 2px 12px #0001" : "0 1px 6px #0001,0 2px 12px #0001",
        border: urgent ? "1.5px solid #fca5a5" : "1.5px solid transparent",
        cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
        transition: "transform 0.1s"
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* サムネイル＋画像枚数バッジ */}
      {imageCount > 0 && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="thumbnail"
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1.5px solid #e5e7eb", display: "block" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 10, background: "#e5e7eb" }} />
          )}
          <span style={{
            position: "absolute", bottom: -5, right: -5,
            background: "#7c3aed", color: "#fff", fontSize: 9, fontWeight: 700,
            borderRadius: 999, padding: "1.5px 5px", border: "1.5px solid #fff", lineHeight: 1.4,
          }}>
            📷{imageCount}
          </span>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1行目: タイトル＋ステータス */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{
            flex: "1 1 0%", minWidth: 0, fontWeight: 800, fontSize: 15, color: "#1a0a2e",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {title}
          </span>
          <span style={{ flexShrink: 0 }}><StatusBadge status={status} /></span>
        </div>
        {/* 2行目: 絵師名（省略可）＋納期（常に表示） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#666" }}>
          <span style={{ flex: "1 1 0%", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            🖌 {artist}{xId && <span style={{ color: "#7c3aed", marginLeft: 4 }}>{xId}</span>}
          </span>
          <span style={{ flexShrink: 0, fontWeight: 700, color: urgent ? "#ef4444" : "#999" }}>
            納期 {fmtShortDate(deadline)}
          </span>
        </div>
      </div>

      {/* 金額・納期カウントダウン */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a0a2e" }}>{fmtPrice(price)}</div>
        {days !== null && status !== "done" && status !== "cancelled" && (
          <div style={{
            fontSize: 10, fontWeight: 700, marginTop: 2,
            color: days < 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#aaa"
          }}>
            {days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? "本日納期" : `残${days}日`}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 依頼一覧のカード ---
// NOTE: CommissionApp（本番）とDemoApp（デモ）で一覧カードの見た目が
// 二重実装になっており、画像ありの場合の高さや、依頼日にラベルが
// 付いていない等のズレが起きていた。データの取得元（Supabase署名付きURL
// / メモリ上のobjectURL）に依存しないよう、表示に必要な値だけを
// プリミティブなpropsとして受け取る設計にしている。
//
// レイアウトの要点：
// - サムネイル・件名・ステータス・金額を「上段」、絵師名・依頼日・納期・
//   ラフ提出日を「下段」に分離した。以前はこれらが横一列で、画像がある時だけ
//   サムネイルの分だけ横幅が狭くなり、下段の各項目がバラバラに1行ずつ
//   折り返されて縦に間延びしていた。下段をカード全幅で使う行にすることで、
//   画像の有無によるカードの高さの差を抑えている。
// - 各項目（例:「⏰ 納期: 2026/09/25」）には`whiteSpace: "nowrap"`を付け、
//   ラベルと値の間で改行されてしまう問題を防いでいる（折り返しは項目単位で行われる）。
// - 依頼日にも「📅 依頼日:」のラベルを付け、納期・ラフ提出日と表記を揃えて
//   何の日付か一目で分かるようにしている。
// - 画像の枚数はテキスト行に出さず、サムネイルの右下に小さなバッジとして
//   重ねて表示する（2枚以上の時のみ）。テキスト行を1行減らせるうえ、
//   「枚数がどの画像に対するものか」が視覚的に明確になる。
export function CommissionCard({
  title, status, price, currency, artist, xId, orderedAt, deadline, roughDate,
  thumbnailUrl, imageCount, onClick,
}: {
  title: string;
  status: CommissionStatus;
  price?: number;
  currency?: string;
  artist: string;
  xId?: string;
  orderedAt?: string;
  deadline?: string;
  roughDate?: string;
  /** 一覧サムネイルのURL。imageCount > 0 だがまだ取得できていない場合はundefined（読み込み中のプレースホルダーを表示） */
  thumbnailUrl?: string;
  imageCount: number;
  onClick: () => void;
}) {
  const days = daysUntil(deadline);
  const urgent = days !== null && days <= 7 && status !== "done" && status !== "cancelled";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 16, padding: "16px 20px",
        boxShadow: urgent ? "0 0 0 2px #ef444460,0 2px 12px #0001" : "0 1px 6px #0001,0 2px 12px #0001",
        border: urgent ? "1.5px solid #fca5a5" : "1.5px solid transparent",
        cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
        transition: "transform 0.1s"
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* 上段：サムネイル・件名・ステータス・金額 */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {imageCount > 0 && (
          <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="thumbnail"
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: "1.5px solid #e5e7eb", display: "block" }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 10, background: "#e5e7eb" }} />
            )}
            {imageCount > 1 && (
              <span style={{
                position: "absolute", bottom: -4, right: -4,
                background: "#1a0a2ee6", color: "#fff", fontSize: 10, fontWeight: 700,
                borderRadius: 999, padding: "1px 6px", lineHeight: "14px",
                boxShadow: "0 1px 4px #0003", whiteSpace: "nowrap"
              }}>
                📷{imageCount}
              </span>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#1a0a2e" }}>{title}</span>
          <StatusBadge status={status} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#1a0a2e" }}>{fmtPrice(price, currency)}</div>
          {days !== null && status !== "done" && status !== "cancelled" && (
            <div style={{ fontSize: 11, color: days < 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#aaa", marginTop: 2 }}>
              {days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? "今日が納期" : `残${days}日`}
            </div>
          )}
        </div>
      </div>

      {/* 納期が近い場合の警告。フル幅の独立行にして上段の折り返しに巻き込まれないようにする */}
      {urgent && (
        <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠ 納期まであと{days}日</div>
      )}

      {/* 下段：絵師名・依頼日・納期・ラフ提出日。カード全幅を使えるため、
          画像ありのカードだけ極端に縦長になることを防いでいる */}
      <div style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap", fontSize: 12, color: "#555" }}>
        <span style={{ whiteSpace: "nowrap" }}>
          🖌 {artist}{xId && <span style={{ color: "#7c3aed", marginLeft: 4 }}>{xId}</span>}
        </span>
        <span style={{ whiteSpace: "nowrap" }}>📅 依頼日: {fmtDate(orderedAt)}</span>
        <span style={{ whiteSpace: "nowrap" }}>⏰ 納期: {fmtDate(deadline)}</span>
        {roughDate && <span style={{ whiteSpace: "nowrap" }}>✏️ ラフ: {fmtDate(roughDate)}</span>}
      </div>
    </div>
  );
}
