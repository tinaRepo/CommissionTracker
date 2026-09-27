"use client";

import type { UseCommissionSearchResult } from "@/hooks/useCommissionSearch";
import { STATUSES, Field, DateRangeField, inp, fmtPrice } from "./CommissionShared";

// ============================================================
// CommissionApp・DemoApp共通の検索バー（ステータス・並び替え・
// 開閉式の詳細検索パネル・合計金額表示）。
//
// useCommissionSearch()の戻り値をそのまま渡すだけで動作する。
// 新しい検索条件を追加する場合は、hooks/useCommissionSearch.ts と
// このファイルの両方を編集し、CommissionApp/DemoApp側は
// 変更しなくて済むようにすること。
// ============================================================

type Props<T> = {
  search: UseCommissionSearchResult<T>;
};

export function CommissionSearchBar<T>({ search }: Props<T>) {
  const {
    filterStatus, setFilterStatus,
    sortKey, setSortKey,
    sortDir, setSortDir,
    showFilters, setShowFilters,
    keyword, setKeyword,
    orderedFrom, setOrderedFrom, orderedTo, setOrderedTo,
    deadlineFrom, setDeadlineFrom, deadlineTo, setDeadlineTo,
    priceMin, setPriceMin, priceMax, setPriceMax,
    showTotalPrice, setShowTotalPrice,
    filtered, totalPrice, activeFilterCount, clearAdvancedFilters,
  } = search;

  return (
    <>
      {/* フィルタ＋ソート */}
      <div style={{ padding: "16px 32px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* ステータス：プルダウン方式 */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          style={{
            padding: "6px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10,
            fontSize: 13, fontWeight: 600, outline: "none", background: "#fff", color: "#333", cursor: "pointer"
          }}>
          <option value="all">すべてのステータス</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        {/* 詳細検索の開閉ボタン */}
        {/* NOTE: キーワード・日付レンジ・金額レンジ・合計金額表示など検索条件が
            増えるとUXが低下するため、既定では折りたたんでおき、必要な人だけ
            ここを押して開く。何か条件が効いている場合は件数をバッジ表示する。 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showFilters ? "#ede9fe" : "#fff",
            color: showFilters ? "#7c3aed" : "#555",
            border: `1.5px solid ${showFilters ? "#c4b5fd" : "#e5e7eb"}`,
            borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>
          🔍 詳細検索
          {activeFilterCount > 0 && (
            <span style={{
              background: "#7c3aed", color: "#fff", borderRadius: 999,
              fontSize: 10, fontWeight: 700, padding: "1px 6px", minWidth: 16, textAlign: "center"
            }}>
              {activeFilterCount}
            </span>
          )}
          <span style={{ fontSize: 10, transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {/* 並び替え */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as any)}
            style={{ padding: "5px 10px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 12, outline: "none", background: "#fff", color: "#555", cursor: "pointer" }}>
            <option value="ordered_at">依頼日順</option>
            <option value="deadline">納期順</option>
            <option value="price">金額順</option>
            <option value="status">ステータス順</option>
          </select>
          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            style={{ padding: "5px 10px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 12, background: "#fff", color: "#555", cursor: "pointer", fontWeight: 700 }}>
            {sortDir === "asc" ? "↑ 昇順" : "↓ 降順"}
          </button>
        </div>
      </div>

      {/* 詳細検索パネル（開閉式） */}
      {showFilters && (
        <div style={{
          margin: "10px 32px 0", background: "#fff", border: "1.5px solid #ede9fe",
          borderRadius: 14, padding: "18px 20px", display: "grid", gap: 16
        }}>
          <Field label="キーワード（件名・絵師名・X ID・メモ）">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="例: アイコン、花咲りん"
              style={inp}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <DateRangeField label="依頼日" from={orderedFrom} to={orderedTo} onFromChange={setOrderedFrom} onToChange={setOrderedTo} />
            <DateRangeField label="納期" from={deadlineFrom} to={deadlineTo} onFromChange={setDeadlineFrom} onToChange={setDeadlineTo} />
          </div>

          <Field label="金額（円）">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number" inputMode="numeric" value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="下限" style={{ ...inp, flex: 1 }}
              />
              <span style={{ color: "#aaa", flexShrink: 0 }}>〜</span>
              <input
                type="number" inputMode="numeric" value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="上限" style={{ ...inp, flex: 1 }}
              />
            </div>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showTotalPrice}
              onChange={e => setShowTotalPrice(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            検索結果の合計金額を表示する
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={clearAdvancedFilters}
              disabled={activeFilterCount === 0}
              style={{
                background: "none", border: "none", cursor: activeFilterCount === 0 ? "default" : "pointer",
                color: activeFilterCount === 0 ? "#ccc" : "#7c3aed", fontSize: 12, fontWeight: 700, padding: "4px 8px"
              }}>
              条件をクリア
            </button>
          </div>
        </div>
      )}

      {/* 合計金額（詳細検索パネルのチェックがオンの時だけ表示） */}
      {showTotalPrice && (
        <div style={{
          margin: "10px 32px 0", padding: "10px 16px", background: "#f8f7ff",
          border: "1px solid #ede9fe", borderRadius: 10,
          fontSize: 13, color: "#5b21b6", fontWeight: 700,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6
        }}>
          <span>💰 検索結果の合計金額</span>
          <span>{fmtPrice(totalPrice, "JPY")}（該当 {filtered.length} 件）</span>
        </div>
      )}
    </>
  );
}
