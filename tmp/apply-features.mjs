// ============================================================
// v2.1.0 の機能追加に伴う、既存ファイルへの小さな修正（1回きり。適用後は削除してよい）
// ------------------------------------------------------------
//   node scripts/apply-features.mjs --dry-run   # 変更内容の確認のみ
//   node scripts/apply-features.mjs             # 適用
//
//   - app/guide/page.tsx : 通知時刻・アカウント削除の説明を更新し、タグ・カレンダーの節を追加
//   - app/pricing/page.tsx : 支払い失敗（past_due）中もポータルへのボタンを表示
//   - app/login/page.tsx : アカウント削除後（?deleted=1）の完了メッセージ
//   - docs/seo-and-ads.md : AdSenseの読み込み方法（公開ページに限定）の記述を更新
//   - package.json : typecheck スクリプトの追加
// 安全装置は apply-v2-polish.mjs と同じ（ちょうど1回一致しなければ書き込まない／適用済みはスキップ）。
// ============================================================
import fs from "node:fs";
import path from "node:path";

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
    "<p>納期が近いタスクを<strong>毎朝8時（既定）にプッシュ通知</strong>でお知らせします。通知する時刻は、ユーザーメニュー →「通知時刻を設定」で変更できます。</p>");
  t = once(t,
    "納期まで7日以内のタスクがある場合、毎朝8時に通知が届きます。納期当日まで毎日届きます。",
    "納期まで7日以内のタスクがある場合、設定した時刻（既定は毎朝8時）に通知が届きます。納期当日まで毎日届きます。通知は端末ごとにオン・オフできます。");
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

editFile("docs/seo-and-ads.md", (t, once, line) => {
  if (t.includes("AdSenseLoader")) return t;
  return line(t, l => l.includes("AdSense loaderは") && l.includes("<head>"),
    () => "- AdSenseの広告スクリプトは、公開コンテンツページ（`/lp`・`/guide`・`/terms`・`/privacy`・`/tokusho`）だけで読み込む（`components/AdSenseLoader.tsx`）。ログイン後のアプリ・ログイン画面・料金ページ・エラー/メンテナンス画面など、公開コンテンツのない画面に広告を出すとポリシー違反になるおそれがあるため。所有確認用の`<meta name=\"google-adsense-account\">`は`app/layout.tsx`で全ページに出している（広告は読み込まない）。`next/script`を使うとNext.jsが`data-nscript`属性を付与しAdSenseから警告が出るため、スクリプトは`AdSenseLoader`が手動で挿入する。広告を表示するページを増やす場合は`AD_ALLOWED_PATHS`に追加する。");
});

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
