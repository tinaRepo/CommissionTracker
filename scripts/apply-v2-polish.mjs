// ============================================================
// v2.0.0 仕上げ用の一括置換スクリプト（1回きり。適用後は削除してよい）
// ------------------------------------------------------------
//   node scripts/apply-v2-polish.mjs --dry-run   # 変更内容の確認のみ（書き込まない）
//   node scripts/apply-v2-polish.mjs             # 適用
//
// 内容:
//   1. ステータス「制作中」→「対応中」、画像タイプ「制作中」→「作業中」（表示ラベルのみ。DB値は不変）
//   2. PLAN_LIMITS の色を単色アクセント方針へ
//   3. 記号文字（✓ ← › ▾ ＋ + G）を <Icon> / <GoogleLogo> へ置換
//   4. fontWeight を DESIGN.md の太さ（400/600）へ統一（700→600 / 500→400 / 900→600）
//   5. LPのナビ背景、manifest.json、icon0.svg、rebrand-plan.md
//
// 安全装置:
//   - 置換前の文字列が「ちょうど1回」見つからなければ、そのファイルは書き込まず報告する
//   - すでに適用済み（置換後の文字列がある）なら黙ってスキップ（再実行しても壊れない）
//   - 実行前に git の作業ツリーをコミットしておくこと。適用後は git diff で確認する
//
// 前提: 先に components/TaskShared.tsx（GoogleLogo追加・ラベル変更済み）と
//       app/components.css（.doc-back-btnのinline-flex化）を差し替えておくこと。
// ============================================================
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry-run");

const problems = [];
const changed = [];

const abs = f => path.join(ROOT, f);
const exists = f => fs.existsSync(abs(f));

function walk(dir, exts, out = []) {
  if (!fs.existsSync(abs(dir))) return out;
  for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, exts, out);
    else if (exts.some(x => e.name.endsWith(x))) out.push(rel);
  }
  return out;
}

// 1ファイル分の編集。fn(text, rep) が新しい本文を返す。問題があれば書き込まない。
function editFile(file, fn) {
  if (!exists(file)) { problems.push(`${file}: ファイルが見つかりません`); return; }
  const original = fs.readFileSync(abs(file), "utf8");
  let fileProblems = 0;
  const rep = {
    // from が ちょうど1回 → 置換 / 0回で to が既にある → 適用済み / それ以外 → 問題
    once(text, from, to) {
      if (text.includes(to)) return text; // 適用済み（to が from を含む場合の二重適用も防ぐ）
      const n = text.split(from).length - 1;
      if (n === 1) return text.replace(from, () => to);
      fileProblems++;
      problems.push(`${file}: 「${from.slice(0, 50)}…」が${n}回見つかりました（期待: 1回）`);
      return text;
    },
    // 全置換（0回でも問題にしない。汎用の正規表現・文言用）
    all(text, from, to) {
      return typeof from === "string" ? text.split(from).join(to) : text.replace(from, to);
    },
    line(text, pred, fnLine) {
      const lines = text.split("\n");
      const i = lines.findIndex(pred);
      if (i < 0) { fileProblems++; problems.push(`${file}: 対象行が見つかりません`); return text; }
      const r = fnLine(lines[i]);
      if (Array.isArray(r)) lines.splice(i, 1, ...r); else lines[i] = r;
      return lines.join("\n");
    },
  };
  const next = fn(original, rep);
  if (fileProblems > 0) { problems.push(`${file}: 問題があったため書き込みません`); return; }
  if (next !== original) {
    if (!DRY) fs.writeFileSync(abs(file), next);
    changed.push(file);
  }
}

// <Icon> / <GoogleLogo> を使うファイルに import を足す
const ICON_IMPORT_RE = /import\s*\{[^}]*\bIcon\b[^}]*\}\s*from\s*["'](?:@\/components\/TaskShared|\.\/TaskShared)["']/;
function ensureIconImport(text) {
  if (!text.includes("<Icon ") || ICON_IMPORT_RE.test(text)) return text;
  const imp = 'import { Icon } from "@/components/TaskShared";';
  if (/"use client";/.test(text)) return text.replace(/"use client";/, `"use client";\n\n${imp}`);
  return `${imp}\n${text}`;
}

// ------------------------------------------------------------
// 個別編集
// ------------------------------------------------------------

// lib/supabase.ts
editFile("lib/supabase.ts", (t, r) => {
  t = r.once(t, "progress: 制作中", "progress: 対応中");
  t = r.once(t, "wip: 制作中", "wip: 作業中");
  t = r.once(t, 'color: "#6b7280", bg: "#f3f4f6"', 'color: "#6e6e73", bg: "#f5f5f7"');
  t = r.once(t, 'color: "#3b82f6", bg: "#dbeafe"', 'color: "#0066cc", bg: "#e8f1fb"');
  t = r.once(t, 'color: "#f59e0b", bg: "#fef3c7"', 'color: "#ffffff", bg: "#1d1d1f"');
  return t;
});

// LP
editFile("app/lp/page.tsx", (t, r) => {
  t = r.once(t, 'status: "制作中", deadline: "04/05"', 'status: "対応中", deadline: "04/05"');
  t = r.once(t, "依頼済み・確認中・制作中・完成・キャンセルの5段階で進捗を管理。", "依頼済み・確認中・対応中・完成・キャンセルの5段階で進捗を管理。");
  t = r.once(t, "確認用・制作中・完成画像をアップロードして一括管理。", "確認用・作業中・完成画像をアップロードして一括管理。");
  t = r.once(t, "rgba(11,11,15,0.9)", "rgba(0,0,0,0.8)");
  t = r.once(t, '"blur(10px)"', '"saturate(180%) blur(20px)"');
  t = r.once(t,
    '<span style={{ color: "var(--accent)" }}>✓</span>{f}',
    '<span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="check" size={16} /></span>{f}');
  t = r.once(t,
    '<span style={{ color: "var(--accent)", fontSize: 18, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>',
    '<span style={{ color: "var(--accent)", display: "inline-flex", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}><Icon name="plus" size={18} /></span>');
  return t;
});

// ガイド
editFile("app/guide/page.tsx", (t, r) => {
  t = r.once(t, '{ label: "制作中", cls: "badge-progress" }', '{ label: "対応中", cls: "badge-progress" }');
  t = r.once(t, "確認用・制作中・完成・その他の種類を選んでアップロードしてください。", "確認用・作業中・完成・その他の種類を選んでアップロードしてください。");
  return t;
});

// 料金ページ
editFile("app/pricing/page.tsx", (t, r) =>
  r.once(t,
    '<span style={{ color: "var(--accent)" }}>✓</span>{f}',
    '<span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="check" size={16} /></span>{f}'));

// 詳細検索バー
editFile("components/TaskSearchBar.tsx", (t, r) => {
  t = r.once(t,
    'import { STATUSES, Field, DateRangeField, fmtPrice, cx } from "./TaskShared";',
    'import { STATUSES, Field, DateRangeField, Icon, fmtPrice, cx } from "./TaskShared";');
  t = r.once(t,
    '<span style={{ fontSize: 10, transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}>▾</span>',
    '<span style={{ display: "inline-flex", transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}><Icon name="chevronDown" size={12} /></span>');
  return t;
});

// お知らせモーダル
editFile("components/NotificationsModal.tsx", (t, r) => {
  t = r.once(t,
    '<span style={{ color: "var(--meta)", flexShrink: 0 }}>›</span>',
    '<span style={{ color: "var(--meta)", flexShrink: 0, display: "inline-flex" }}><Icon name="chevronRight" size={16} /></span>');
  t = r.once(t,
    'style={{ background: "none", border: "none", fontSize: 13, color: "var(--accent)", fontWeight: 600, padding: "0 0 16px" }}',
    'style={{ background: "none", border: "none", fontSize: 13, color: "var(--accent)", fontWeight: 600, padding: "0 0 16px", display: "inline-flex", alignItems: "center", gap: 4 }}');
  t = r.once(t, "← 一覧に戻る", '<Icon name="arrowLeft" size={14} /> 一覧に戻る');
  return t;
});

// お知らせ・バージョン管理（管理者）
editFile("components/AdminNotificationsPage.tsx", (t, r) =>
  r.once(t,
    '<button onClick={addItem} className="btn btn-secondary btn-sm">＋ 追加</button>',
    '<button onClick={addItem} className="btn btn-secondary btn-sm"><Icon name="plus" size={14} /> 追加</button>'));

// 管理者ページ（更新ボタンを歯車→更新アイコンへ）
editFile("app/mgmt-c7f2a91e/page.tsx", (t, r) =>
  r.once(t,
    '<button onClick={loadUsers} className="icon-btn"><Icon name="settings" size={15} /></button>',
    '<button onClick={loadUsers} className="icon-btn" title="再読み込み" aria-label="再読み込み"><Icon name="refresh" size={15} /></button>'));

// ログイン画面のGoogleボタン
editFile("app/login/page.tsx", (t, r) => {
  t = r.once(t,
    'import ContactModal from "@/components/ContactModal";',
    'import ContactModal from "@/components/ContactModal";\nimport { GoogleLogo } from "@/components/TaskShared";');
  t = r.once(t, '<span style={{ fontWeight: 900, fontSize: 15 }}>G</span>', "<GoogleLogo size={18} />");
  return t;
});

// ヘッダーのアバターに付く「前回Googleでログイン」バッジ
editFile("components/TaskApp.tsx", (t, r) => {
  t = r.once(t,
    "Field, DateField, StatusBadge, TaskListCard, Icon, cx,",
    "Field, DateField, StatusBadge, TaskListCard, Icon, GoogleLogo, cx,");
  t = r.once(t, "}}>G</span>", "}}><GoogleLogo size={9} /></span>");
  return t;
});

// PWA
editFile("public/manifest.json", (t, r) => {
  t = r.once(t, '"theme_color": "#0b0b0f"', '"theme_color": "#000000"');
  t = r.once(t, '"background_color": "#0b0b0f"', '"background_color": "#272729"');
  return t;
});
editFile("public/icon0.svg", (t, r) => {
  t = r.once(t, 'fill="#0b0b0f"', 'fill="#272729"');
  t = r.once(t, 'stroke="#4f46e5"', 'stroke="#2997ff"');
  return t;
});

// docs/rebrand-plan.md
editFile("docs/rebrand-plan.md", (t, r) => {
  t = r.line(t, l => l.includes("画像タイプ「作業中」"),
    () => "| 画像タイプ「作業中」           | 作業中（ステータスの汎用化に伴い旧表記へ戻した） |");
  if (!t.includes("制作中（ステータス）")) {
    t = r.line(t, l => l.includes("ラフ確認中（ステータス）"),
      l => [l, "| 制作中（ステータス）           | 対応中（他業種でも通用する語へ汎用化） |"]);
  }
  t = r.once(t,
    "ステータス（依頼済み／確認中／制作中／完成／キャンセル）・画像タイプ（確認用／制作中／完成／その他）は",
    "ステータス（依頼済み／確認中／対応中／完成／キャンセル）・画像タイプ（確認用／作業中／完成／その他）は");
  if (!t.includes("表示ラベルのみの変更")) {
    t = r.line(t, l => l.includes("は元々汎用的なため変更していない。"),
      l => [l, "",
        "ステータス「制作中」→「対応中」・画像タイプ「制作中」→「作業中」は**表示ラベルのみの変更**で、",
        "DBの値（`progress` / `wip`）は不変のためマイグレーションは不要。ラベルは`components/TaskShared.tsx`の",
        "`STATUSES` / `IMAGE_TYPES`が唯一の定義元。"]);
  }
  return t;
});

// ------------------------------------------------------------
// 一括編集: fontWeight の統一 / 「← 戻る」のアイコン化 / Icon import の補完
//   app/ と components/ の .tsx が対象（メールHTMLを含む .ts のAPIルートは対象外）
// ------------------------------------------------------------
for (const file of [...walk("app", [".tsx"]), ...walk("components", [".tsx"])]) {
  if (path.basename(file) === "TaskShared.tsx") continue; // 定義元は別途差し替え済み
  editFile(file, (t, r) => {
    // 1パスで写像する（700→600→… と連鎖して再実行のたびに変わるのを防ぐ）
    t = r.all(t, /fontWeight:\s*(700|500|900)\b/g, (_, w) => `fontWeight: ${{ 700: 600, 500: 400, 900: 600 }[w]}`);
    t = r.all(t, /\?\s*700\s*:\s*500\b/g, "? 600 : 400");
    t = r.all(t, />\s*← 戻る\s*<\/button>/g, '><Icon name="arrowLeft" size={14} /> 戻る</button>');
    return ensureIconImport(t);
  });
}

// ------------------------------------------------------------
// 結果表示
// ------------------------------------------------------------
console.log(DRY ? "[dry-run] 変更される（された）ファイル:" : "変更したファイル:");
[...new Set(changed)].sort().forEach(f => console.log("  M", f));
if (changed.length === 0) console.log("  （なし。すでに適用済みか、対象が見つかりません）");

if (problems.length > 0) {
  console.error("\n要確認（該当ファイルは書き込んでいません）:");
  problems.forEach(p => console.error("  !", p));
  process.exitCode = 1;
} else {
  console.log(DRY ? "\n問題なし。--dry-run を外して実行してください。" : "\n完了。git diff で内容を確認してください。");
}
