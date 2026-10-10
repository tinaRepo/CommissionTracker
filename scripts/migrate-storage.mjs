// ============================================================
// Storage移行スクリプト: commission-images → task-images
// ------------------------------------------------------------
// 使い方（Node 20.6+。接続先は環境変数で切り替える）:
//   node --env-file=.env.local scripts/migrate-storage.mjs --dry-run   # 確認のみ
//   node --env-file=.env.local scripts/migrate-storage.mjs             # コピー実行
//   node --env-file=.env.local scripts/migrate-storage.mjs --cleanup   # 検証OKなら旧バケット削除
//
// 特徴:
//   - 冪等（コピー済みのファイルはスキップ）。何度でも再実行できる
//   - task-images が無ければ非公開バケットとして作成する
//     （SQLマイグレーションより前に実行して事前コピーしておける）
//   - パス構造 {user_id}/{task_id}/{type}_{timestamp}.{ext} は変更しないので
//     task_images.storage_path の更新は不要
//   - Storage APIのcopy（destinationBucket指定）を使うため、ファイル実体も正しくコピーされる
//     （storage.objects をSQLで直接INSERTしても実体はコピーされない）
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SRC = "commission-images";
const DST = "task-images";
const DRY = process.argv.includes("--dry-run");
const CLEANUP = process.argv.includes("--cleanup");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です");
  process.exit(1);
}
console.log(`接続先: ${url}`);

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// バケット内の全ファイルパスを再帰的に列挙（フォルダは id === null）
async function listAll(bucket, prefix = "") {
  const out = [];
  let offset = 0;
  for (; ;) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, {
      limit: 100, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const e of data) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...(await listAll(bucket, p)));
      else out.push(p);
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

async function ensureDestBucket() {
  const { data } = await sb.storage.getBucket(DST);
  if (data) return;
  console.log(`${DST} が無いため作成します（private）`);
  if (DRY) return;
  const { error } = await sb.storage.createBucket(DST, { public: false });
  if (error) throw error;
}

async function main() {
  await ensureDestBucket();

  const srcPaths = await listAll(SRC);
  const dstSet = new Set(DRY && !(await sb.storage.getBucket(DST)).data ? [] : await listAll(DST));
  const todo = srcPaths.filter(p => !dstSet.has(p));
  console.log(`${SRC}: ${srcPaths.length}件 / ${DST}: ${dstSet.size}件 / 未コピー: ${todo.length}件`);

  if (!CLEANUP) {
    let ok = 0, ng = 0;
    for (let i = 0; i < todo.length; i += 5) {
      const batch = todo.slice(i, i + 5);
      await Promise.all(batch.map(async p => {
        if (DRY) { console.log(`[dry-run] copy ${p}`); return; }
        const { error } = await sb.storage.from(SRC).copy(p, p, { destinationBucket: DST });
        if (error) { ng++; console.error(`NG  ${p}: ${error.message}`); }
        else { ok++; }
      }));
    }
    console.log(`コピー完了: 成功 ${ok} / 失敗 ${ng}`);
  }

  // 検証: DBが参照する全パスが task-images に存在するか
  const finalDst = new Set(await listAll(DST).catch(() => []));
  const { data: rows, error } = await sb.from("task_images").select("storage_path");
  if (error) throw error;
  const missing = (rows ?? []).map(r => r.storage_path).filter(p => !finalDst.has(p));
  console.log(`検証: task_images ${rows?.length ?? 0}件中、${DST} に無いもの ${missing.length}件`);
  missing.slice(0, 20).forEach(p => console.log(`  MISSING ${p}`));

  if (CLEANUP) {
    const notCopied = srcPaths.filter(p => !finalDst.has(p));
    if (missing.length > 0 || notCopied.length > 0) {
      console.error("未コピーのファイルがあるため旧バケットは削除しません");
      process.exit(1);
    }
    if (DRY) { console.log(`[dry-run] ${SRC} を空にして削除`); return; }
    for (let i = 0; i < srcPaths.length; i += 100) {
      const { error: rmErr } = await sb.storage.from(SRC).remove(srcPaths.slice(i, i + 100));
      if (rmErr) throw rmErr;
    }
    const { error: delErr } = await sb.storage.deleteBucket(SRC);
    if (delErr) throw delErr;
    console.log(`${SRC} を削除しました`);
    return;
  }

  if (missing.length > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
