// ============================================================
// v2.0.0 セキュリティ・品質修正用の一括置換スクリプト（1回きり。適用後は削除してよい）
// ------------------------------------------------------------
//   node scripts/apply-hardening.mjs --dry-run   # 変更内容の確認のみ（書き込まない）
//   node scripts/apply-hardening.mjs             # 適用
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
//   - docs/supabase-migration-guide.md : 新規テーブルのGRANTの節を追記
//
// 安全装置・使い方は apply-v2-polish.mjs と同じ:
//   - 置換前の文字列が「ちょうど1回」見つからなければ、そのファイルは書き込まず報告する
//   - 適用済みなら黙ってスキップ（再実行しても壊れない）
//   - 実行前に git の作業ツリーをコミットしておき、適用後は git diff で確認する
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
  t = r.once(t, "// --- 画像情報 ---", [
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
// app/layout.tsx — プライバシーポリシー・handoverに記載のVercel Analyticsを実際に設置する
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
// docs/supabase-migration-guide.md — 新規テーブルのGRANT
// ------------------------------------------------------------
const GRANT_MARKER = "# 新規テーブルのGRANT";
const GRANT_SECTION = [
  "---",
  "",
  GRANT_MARKER,
  "",
  "Supabase（クラウド）は、`public` スキーマに新規作成したテーブル・ビュー・関数を、",
  "データAPIのロール（`anon` / `authenticated` / `service_role`）へ**自動公開しない**方針に移行している",
  "（`supabase/config.toml` の `auto_expose_new_tables` のコメント参照。ローカルは未設定なら従来どおり公開される）。",
  "新しいテーブルを作るマイグレーションでは、RLSの有効化に加えて、必要なロールへ**明示的にGRANT**すること。",
  "",
  "```sql",
  "create table public.example (...);",
  "alter table public.example enable row level security;",
  "",
  "-- ブラウザ（ログインユーザー）から読み書きするテーブル: 必要な操作だけ authenticated に付与し、RLSポリシーで絞る",
  "grant select, insert, update, delete on public.example to authenticated;",
  "-- ログイン前にも読ませるテーブルだけ anon にも付与する（例: app_settings の select）",
  "-- grant select on public.example to anon;",
  "",
  "-- サーバー（service_role）専用のテーブル: anon / authenticated には何も付与しない",
  "revoke all on public.example from anon, authenticated;",
  "grant select, insert, update, delete on public.example to service_role;",
  "```",
  "",
  "- 付与を忘れると、データAPIから `permission denied for table ...`（42501）になる。",
  "- 関数（RPC）は既定で PUBLIC に実行権限が付く。公開したくない関数は",
  "  `revoke all on function ... from public, anon, authenticated;` してから、必要なロールにだけ `grant execute` する。",
  "- テーブルの rename（v2.0.0の commissions→tasks）では既存のGRANTが引き継がれるため、再付与は不要。",
  "- 実装例: `20260927000001_V1.2.0_add_maintenance_mode.sql`（anon / authenticated への select）、",
  "  `20261005000000_V2.0.1_hardening.sql`（`api_rate_limits` と `check_rate_limit()` は service_role 専用）。",
].join("\n");
editFile("docs/supabase-migration-guide.md", t =>
  t.includes(GRANT_MARKER) ? t : `${t.trimEnd()}\n\n${GRANT_SECTION}\n`);

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
