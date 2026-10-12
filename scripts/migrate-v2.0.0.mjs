// v1.x -> v2.0.0 one-time code migration.
// Storage data migration is intentionally handled separately by migrate-storage.mjs.
//
//   node scripts/migrate-v2.0.0.mjs --dry-run
//   node scripts/migrate-v2.0.0.mjs --apply
//
// Prepare the replacement application files before running this script.
import fs from "node:fs";
import path from "node:path";

function runV2Polish() {
  // ============================================================
  // v2.0.0移行の内部ステップ（単独では実行せず、migrate-v2.0.0.mjs から呼び出す）
  // ------------------------------------------------------------
  // 実行方法: node scripts/migrate-v2.0.0.mjs --dry-run / --apply
  // このファイルは統合スクリプトから呼び出す内部ステップ。直接実行しない。
  //
  // 内容:
  //   1. ステータス「制作中」→「対応中」、画像タイプ「制作中」→「作業中」（表示ラベルのみ。DB値は不変）
  //   2. PLAN_LIMITS の色を単色アクセント方針へ
  //   3. 記号文字（✓ ← › ▾ ＋ + G）を <Icon> / <GoogleLogo> へ置換
  //   4. fontWeight を DESIGN.md の太さ（400/600）へ統一（700→600 / 500→400 / 900→600）
  //   5. LPのナビ背景、manifest.json、icon0.svg、docs/old/rebrand-plan.md
  //
  // 安全装置:
  //   - 置換前の文字列が「ちょうど1回」見つからなければ、そのファイルは書き込まず報告する
  //   - すでに適用済み（置換後の文字列がある）なら黙ってスキップ（再実行しても壊れない）
  //   - 実行前に git の作業ツリーをコミットしておくこと。適用後は git diff で確認する
  //
  // 前提: 先に components/TaskShared.tsx（GoogleLogo追加・ラベル変更済み）と
  //       app/components.css（.doc-back-btnのinline-flex化）を差し替えておくこと。
  // ============================================================


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
    if (!t.includes('<Icon name="chevronDown"')) {
      t = r.once(t,
        '<span style={{ fontSize: 10, transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}>▾</span>',
        '<span style={{ display: "inline-flex", transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}><Icon name="chevronDown" size={12} /></span>');
    }
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

  // docs/old/rebrand-plan.md (legacy migration archive)
  editFile("docs/old/rebrand-plan.md", (t, r) => {
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
  return problems.length === 0;
}

function runHardening() {
  // ============================================================
  // v2.0.0移行の内部ステップ（単独では実行せず、migrate-v2.0.0.mjs から呼び出す）
  // ------------------------------------------------------------
  // 実行方法: node scripts/migrate-v2.0.0.mjs --dry-run / --apply
  // このファイルは統合スクリプトから呼び出す内部ステップ。直接実行しない。
  //
  // 対象（既存ファイルへの部分修正のみ。全面差し替えのファイルは別途コピーすること）:
  //   - lib/supabase.ts          : タスクの空更新(null)対応の型・fetchTasksの1000件超対応・
  //                                アップロード失敗時の孤児ファイル掃除・パスワード最小長 6→8
  //   - components/TaskApp.tsx   : 項目を空にして保存できるように(null)・画像トーストの二重表示/誤表示の修正
  //   - components/TaskSearchBar.tsx : iOSの自動ズーム対策（selectのfontSizeを16px未満にしない）
  //   - components/ContactModal.tsx  : 確認メール文言をログイン時のみ表示（APIの仕様変更に合わせる）
  //   - app/login/page.tsx       : ログインは既存パスワード（6文字以上）を弾かない
  //   - app/layout.tsx           : <Analytics />（Vercel Analytics）の設置
  //   - app/api/stripe/checkout/route.ts : priceId を許可した2つに限定
  //   - app/**/*.tsx, components/**/*.tsx : モーダルに role="dialog" aria-modal="true"
  //   - package.json             : next / eslint-config-next を 14.2.35 へ（※ npm install も必要）
  //   - supabase/config.toml     : minimum_password_length = 8
  //   - database operations guidance is maintained separately from this one-time code migration
  //
  // Patch safety:
  //   - 置換前の文字列が「ちょうど1回」見つからなければ、そのファイルは書き込まず報告する
  //   - 適用済みなら黙ってスキップ（再実行しても壊れない）
  //   - 実行前に git の作業ツリーをコミットしておき、適用後は git diff で確認する
  // ============================================================


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

  function editFile(file, fn) {
    if (!exists(file)) { problems.push(`${file}: ファイルが見つかりません`); return; }
    const original = fs.readFileSync(abs(file), "utf8");
    let fileProblems = 0;
    const rep = {
      // from が ちょうど1回 → 置換 / to が既にある → 適用済み / それ以外 → 問題
      once(text, from, to) {
        if (text.includes(to)) return text;
        const n = text.split(from).length - 1;
        if (n === 1) return text.replace(from, () => to);
        fileProblems++;
        problems.push(`${file}: 「${from.slice(0, 50)}…」が${n}回見つかりました（期待: 1回）`);
        return text;
      },
      // 正規表現の置換。expected回マッチすれば置換。0回で marker（旧コードの目印）も無ければ適用済み。
      regex(text, re, toFn, { expected = 1, marker = null, label = "" } = {}) {
        // マッチ回数を数える（match()は非gフラグだとキャプチャグループも配列に含むため、matchAllで数える）
        const n = [...text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))].length;
        if (n === expected) return text.replace(re, toFn);
        if (n === 0 && (!marker || !text.includes(marker))) return text; // 適用済み
        fileProblems++;
        problems.push(`${file}: ${label || String(re).slice(0, 50)} が${n}回マッチしました（期待: ${expected}回）`);
        return text;
      },
      all(text, from, to) {
        return typeof from === "string" ? text.split(from).join(to) : text.replace(from, to);
      },
    };
    const next = fn(original, rep);
    if (fileProblems > 0) { problems.push(`${file}: 問題があったため書き込みません`); return; }
    if (next !== original) {
      if (!DRY) fs.writeFileSync(abs(file), next);
      changed.push(file);
    }
  }

  // ------------------------------------------------------------
  // lib/supabase.ts
  // ------------------------------------------------------------
  editFile("lib/supabase.ts", (t, r) => {
    // (1) 作成・更新用の入力型。空にした項目は null で送る（undefined だと update で無視される）
    if (!t.includes("export interface TaskInput")) t = r.once(t, "// --- 画像情報 ---", [
      "// --- タスクの作成・更新用の入力（空にした項目は undefined ではなく null で送る） ---",
      "// ※ supabase-js の update() は undefined のキーを無視するため、項目を「空にする」には null が必要",
      "export interface TaskInput {",
      "  title: string;",
      "  assignee_name: string;",
      "  contact: string | null;",
      "  ordered_at: string | null;",
      "  deadline: string | null;",
      "  price: number | null;",
      "  currency: string;",
      "  status: TaskStatus;",
      "  submission_date: string | null;",
      "  notes: string | null;",
      "}",
      "",
      "// --- 画像情報 ---",
    ].join("\n"));

    // updateTask を先に置換してから createTask（updateTask側の Omit は Partial<...> に包まれている）
    t = r.once(t,
      'values: Partial<Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "images">>',
      "values: Partial<TaskInput>");
    t = r.once(t,
      'values: Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "images">',
      "values: TaskInput");

    // (2) パスワード最小長 6 → 8（新規登録・変更時のみ。ログインは既存パスワードを弾かない）
    t = r.once(t, "export const PASSWORD_MIN_LENGTH = 6;", "export const PASSWORD_MIN_LENGTH = 8;");

    // (3) fetchTasks: 1000件（max_rows）で打ち切られないよう、ページングで全件取得
    if (!t.includes("const PAGE = 1000")) {
      t = r.regex(t,
        /export async function fetchTasks\(\): Promise<Task\[\]> \{[\s\S]*?\n\}\n/,
        () => [
          "export async function fetchTasks(): Promise<Task[]> {",
          "  // PostgRESTの1リクエスト上限（max_rows=1000）を超えても全件取得できるようページングする",
          "  const PAGE = 1000;",
          "  const all: Task[] = [];",
          "  for (let from = 0; ; from += PAGE) {",
          "    const { data, error } = await supabase",
          '      .from("tasks")',
          '      .select("*, images:task_images(*)")',
          '      .order("created_at", { ascending: false })',
          '      .order("id", { ascending: true }) // 同時刻の行で順序が揺れないようにする',
          "      .range(from, from + PAGE - 1);",
          "    if (error) throw error;",
          "    all.push(...(data ?? []));",
          "    if (!data || data.length < PAGE) break;",
          "  }",
          "  return all;",
          "}",
          "",
        ].join("\n"),
        { label: "fetchTasks()" });
    }

    // (4) uploadImage: DB登録に失敗したら、アップロード済みファイルを消す（孤児ファイル防止）。
    //     サーバー側の枚数制限（PLAN_LIMIT）に弾かれた場合は、画面側が解釈できる形式のエラーにする。
    if (!t.includes("孤児ファイルを残さない")) {
      t = r.regex(t,
        /(\.insert\(\{ task_id: taskId, storage_path: path, file_name: file\.name, image_type: imageType \}\)\s*\.select\(\)\.single\(\);)\s*if \(error\) throw error;/,
        (_m, head) => [
          head,
          "  if (error) {",
          "    // DBに登録できなかった場合は孤児ファイルを残さない",
          "    await supabase.storage.from(BUCKET).remove([path]);",
          '    if (error.message?.includes("PLAN_LIMIT")) {',
          "      // DBトリガーによる枚数制限（クライアントの事前チェックをすり抜けた場合）",
          "      const { current, limit } = await canUploadImage(plan);",
          "      throw new Error(`PLAN_LIMIT:${current}:${limit}`);",
          "    }",
          "    throw error;",
          "  }",
        ].join("\n"),
        { label: "uploadImage() のDB登録" });
    }
    return t;
  });

  // ------------------------------------------------------------
  // components/TaskApp.tsx
  // ------------------------------------------------------------
  editFile("components/TaskApp.tsx", (t, r) => {
    // 空にした項目を保存できるように、undefined → null
    t = r.once(t, "contact: form.contact || undefined", "contact: form.contact || null");
    t = r.once(t,
      "ordered_at: form.ordered_at || undefined, deadline: form.deadline || undefined,",
      "ordered_at: form.ordered_at || null, deadline: form.deadline || null,");
    t = r.once(t, "price: form.price ? Number(form.price) : undefined", "price: form.price ? Number(form.price) : null");
    t = r.once(t,
      "submission_date: form.submission_date || undefined, notes: form.notes || undefined,",
      "submission_date: form.submission_date || null, notes: form.notes || null,");

    // ImageSection: handleUpload/handleDelete の finally/末尾にある手動トーストを削除。
    // （成功・失敗に関わらず「アップロードしました」と出る不具合。トーストは枚数の増減を検知する
    //   useEffect が1か所で出すため、手動の setTimeout は不要）
    t = r.regex(t,
      /\n[ \t]*setTimeout\(\(\) => \{\n[ \t]*setToast\(`画像を(?:アップロード|削除)しました（最新枚数: \$\{\(task\.images\?\.length \?\? 0\) [+-] 1\}枚）`\);\n[ \t]*setTimeout\(\(\) => setToast\(null\), 3000\);\n[ \t]*\}, 500\);/g,
      () => "",
      { expected: 2, marker: "?? 0) + 1}枚", label: "ImageSectionの手動トースト" });
    return t;
  });

  // ------------------------------------------------------------
  // components/TaskSearchBar.tsx — iOS Safariは16px未満の入力欄にフォーカスすると自動ズームする
  // ------------------------------------------------------------
  editFile("components/TaskSearchBar.tsx", (t, r) => {
    t = r.once(t,
      'style={{ width: "auto", padding: "8px 14px", fontSize: 13, fontWeight: 600 }}',
      'style={{ width: "auto", padding: "8px 14px", fontWeight: 600 }}');
    t = r.once(t,
      'style={{ width: "auto", padding: "7px 12px", fontSize: 12 }}',
      'style={{ width: "auto", padding: "7px 12px" }}');
    return t;
  });

  // ------------------------------------------------------------
  // components/ContactModal.tsx — 自動返信はログイン済みの場合のみ送られる仕様に合わせる
  // ------------------------------------------------------------
  editFile("components/ContactModal.tsx", (t, r) =>
    r.once(t,
      "{email && <>確認メールをお送りしました。<br /></>}",
      "{isLoggedIn && email && <>確認メールをお送りしました。<br /></>}"));

  // ------------------------------------------------------------
  // app/login/page.tsx — パスワード最小長を8にしても、既存ユーザー（6〜7文字）がログインできるように
  // ------------------------------------------------------------
  editFile("app/login/page.tsx", (t, r) => {
    t = r.once(t,
      'const isPasswordValid = mode === "reset" || password.length >= PASSWORD_MIN_LENGTH;',
      'const isPasswordValid = mode === "reset" || (mode === "login" ? password.length > 0 : password.length >= PASSWORD_MIN_LENGTH);');
    t = r.once(t,
      'type="password" placeholder={`パスワード（${PASSWORD_MIN_LENGTH}文字以上）`}',
      'type="password" placeholder={mode === "signup" ? `パスワード（${PASSWORD_MIN_LENGTH}文字以上）` : "パスワード"}');
    t = r.once(t,
      'minLength={PASSWORD_MIN_LENGTH} className="input"',
      'minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined} className="input"');
    return t;
  });

  // ------------------------------------------------------------
  // app/layout.tsx — プライバシーポリシー・開発ガイドに記載のVercel Analyticsを実際に設置する
  // （Vercel Dashboard の Analytics を有効化しないとデータは集計されない）
  // ------------------------------------------------------------
  editFile("app/layout.tsx", (t, r) => {
    t = r.once(t,
      'import Script from "next/script";',
      'import Script from "next/script";\nimport { Analytics } from "@vercel/analytics/next";');
    t = r.once(t, "<PageViewTracker />", "<PageViewTracker />\n        <Analytics />");
    return t;
  });

  // ------------------------------------------------------------
  // app/api/stripe/checkout/route.ts — 任意のPriceで購読させない
  // ------------------------------------------------------------
  editFile("app/api/stripe/checkout/route.ts", (t, r) => {
    if (t.includes("allowedPriceIds")) return t;
    return r.regex(t,
      /(\n[ \t]*if \(!priceId\) \{\n[ \t]*return NextResponse\.json\(\{ error: "priceId is required" \}, \{ status: 400 \}\);\n[ \t]*\})/,
      (_m, block) => [
        block,
        "",
        "    // 許可した2つのPrice ID以外は拒否する（クライアントから任意のPriceを指定させない）",
        "    const allowedPriceIds = [",
        "      process.env.STRIPE_STANDARD_PRICE_ID,",
        "      process.env.STRIPE_PREMIUM_PRICE_ID,",
        "    ].filter((id): id is string => !!id);",
        "    if (!allowedPriceIds.includes(priceId)) {",
        '      return NextResponse.json({ error: "invalid priceId" }, { status: 400 });',
        "    }",
      ].join("\n"),
      { label: "checkoutのpriceId検証" });
  });

  // ------------------------------------------------------------
  // package.json / supabase/config.toml
  // ------------------------------------------------------------
  editFile("package.json", (t, r) => {
    t = r.once(t, '"next": "14.2.5"', '"next": "14.2.35"');
    t = r.once(t, '"eslint-config-next": "14.2.5"', '"eslint-config-next": "14.2.35"');
    return t;
  });
  editFile("supabase/config.toml", (t, r) =>
    r.once(t, "minimum_password_length = 6", "minimum_password_length = 8"));

  // ------------------------------------------------------------
  // 一括編集: モーダルに role="dialog" aria-modal="true"（app/ と components/ の .tsx）
  // ------------------------------------------------------------
  for (const file of [...walk("app", [".tsx"]), ...walk("components", [".tsx"])]) {
    editFile(file, (t, r) => {
      // 置換後は <div role=... className="modal-xxx" となり、元のパターンにはマッチしないので冪等
      t = r.all(t, '<div className="modal-sheet"', '<div role="dialog" aria-modal="true" className="modal-sheet"');
      t = r.all(t, '<div className="modal-compact"', '<div role="dialog" aria-modal="true" className="modal-compact"');
      return t;
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
    if (!DRY && changed.includes("package.json")) {
      console.log("次に実行: npm install   # next / eslint-config-next を 14.2.35 に更新し、package-lock.json を再生成する");
    }
  }
  return problems.length === 0;
}

function runFeatures() {
  // ============================================================
  // v2.0.0移行の内部ステップ（単独では実行せず、migrate-v2.0.0.mjs から呼び出す）
  // ------------------------------------------------------------
  // 実行方法: node scripts/migrate-v2.0.0.mjs --dry-run / --apply
  // このファイルは統合スクリプトから呼び出す内部ステップ。直接実行しない。
  //
  //   - app/guide/page.tsx : 通知時刻・アカウント削除の説明を更新し、タグ・カレンダーの節を追加
  //   - app/pricing/page.tsx : 支払い失敗（past_due）中もポータルへのボタンを表示
  //   - app/login/page.tsx : アカウント削除後（?deleted=1）の完了メッセージ
  // Documentation is maintained outside this one-time application-code migration.
  //   - package.json : typecheck スクリプトの追加
  // Patch safety: require exactly one old-text match; skip changes already applied.
  // ============================================================


  const ROOT = process.cwd();
  const DRY = process.argv.includes("--dry-run");
  const problems = [];
  const changed = [];

  function editFile(file, fn) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) { problems.push(`${file}: ファイルが見つかりません`); return; }
    const original = fs.readFileSync(p, "utf8");
    let bad = 0;
    const once = (t, from, to) => {
      if (t.includes(to)) return t;
      const n = t.split(from).length - 1;
      if (n === 1) return t.replace(from, () => to);
      bad++; problems.push(`${file}: 「${from.slice(0, 50)}…」が${n}回見つかりました（期待: 1回）`);
      return t;
    };
    const line = (t, pred, fnLine) => {
      const lines = t.split("\n");
      const i = lines.findIndex(pred);
      if (i < 0) { bad++; problems.push(`${file}: 対象行が見つかりません`); return t; }
      lines[i] = fnLine(lines[i]);
      return lines.join("\n");
    };
    const next = fn(original, once, line);
    if (bad > 0) { problems.push(`${file}: 問題があったため書き込みません`); return; }
    if (next !== original) { if (!DRY) fs.writeFileSync(p, next); changed.push(file); }
  }

  editFile("app/guide/page.tsx", (t, once) => {
    t = once(t,
      "<p>ユーザーメニュー →「アカウント削除を申請」から削除申請を送信できます。管理者が確認後、アカウントとすべてのデータを削除します。</p>",
      "<p>ユーザーメニュー →「アカウントを削除」から、ご自身でいつでも削除できます（メールアドレスとパスワードの入力が必要です）。タスク・タグ・画像などすべてのデータが削除され、元に戻せません。有料プランをご利用中の場合は、削除と同時に即時解約されます（残りの期間分の返金はありません）。期間の終了まで使いたい場合は、先にプランを解約してください。</p>");
    t = once(t,
      "<p>納期が近いタスクを<strong>毎朝8時にプッシュ通知</strong>でお知らせします。</p>",
      "<p>納期が近いタスクを<strong>毎朝8時（日本時間）にプッシュ通知</strong>でお知らせします。</p>");
    t = once(t,
      "納期まで7日以内のタスクがある場合、毎朝8時に通知が届きます。納期当日まで毎日届きます。",
      "納期まで7日以内のタスクがある日に、毎朝8時（日本時間）に通知が届きます。納期当日まで毎日届きます。通知は端末ごとにオン・オフできます。");
    t = once(t, '        <Section title="納期アラート">', [
      '        <Section title="タグとカレンダー">',
      '          <Step num={1} title="タグで分類する">',
      "            タスクの登録・編集画面の「タグ」欄で、カテゴリや案件名などのタグを付けられます（1タスクに10個まで、全体で100個まで）。一覧の上部のタグのプルダウンで絞り込めます。名前の変更・削除は、ユーザーメニュー →「タグを管理」から行えます。",
      "          </Step>",
      '          <Step num={2} title="カレンダーで見る">',
      "            一覧の右上の「カレンダー」に切り替えると、納期の日にタスクが表示されます。月表示は日付をタップするとその日のタスクが、週表示は1週間ぶんが縦に並びます。ステータスや検索の絞り込みはカレンダーにも反映されます。納期が未設定のタスクは表示されません。",
      "          </Step>",
      "        </Section>",
      "",
      '        <Section title="納期アラート">',
    ].join("\n"));
    return t;
  });

  editFile("app/pricing/page.tsx", (t, once) =>
    once(t,
      'setHasSubscription(!!data.stripe_customer_id && data.subscription_status === "active");',
      'setHasSubscription(!!data.stripe_customer_id && ["active", "past_due"].includes(data.subscription_status ?? ""));'));

  editFile("app/login/page.tsx", (t, once) =>
    once(t,
      'if (params.get("demo") === "1") setDemoMode(true);',
      'if (params.get("demo") === "1") setDemoMode(true);\n    if (params.get("deleted") === "1") {\n      setMessage({ type: "success", text: "アカウントを削除しました。ご利用ありがとうございました。" });\n    }'));

  editFile("package.json", (t, once) =>
    once(t, '"lint": "next lint"', '"lint": "next lint",\n    "typecheck": "tsc --noEmit"'));

  console.log(DRY ? "[dry-run] 変更される（された）ファイル:" : "変更したファイル:");
  changed.sort().forEach(f => console.log("  M", f));
  if (changed.length === 0) console.log("  （なし。すでに適用済みか、対象が見つかりません）");
  if (problems.length > 0) {
    console.error("\n要確認（該当ファイルは書き込んでいません）:");
    problems.forEach(p => console.error("  !", p));
    process.exitCode = 1;
  } else {
    console.log(DRY ? "\n問題なし。--dry-run を外して実行してください。" : "\n完了。git diff で内容を確認してください。");
  }
  return problems.length === 0;
}

const mode = process.argv[2];
if (process.argv.length !== 3 || !["--dry-run", "--apply"].includes(mode)) {
  console.error("Usage: node scripts/migrate-v2.0.0.mjs --dry-run | --apply");
  process.exit(2);
}

console.log(mode === "--dry-run" ? "[dry-run] Checking v2.0.0 migration" : "Applying v2.0.0 migration");
for (const [name, run] of [
  ["Polish and presentation", runV2Polish],
  ["Security and quality", runHardening],
  ["Feature updates", runFeatures],
]) {
  console.log(`\n=== ${name} ===`);
  if (!run()) {
    console.error(`${name} failed; stopping the migration.`);
    process.exit(1);
  }
}

console.log(mode === "--dry-run"
  ? "\nDry-run complete. Use --apply to write the changes."
  : "\nv2.0.0 migration complete. Review the changes with git diff.");
