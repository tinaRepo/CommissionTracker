"use client";

import type { UseTaskSearchResult } from "@/hooks/useTaskSearch";
import { STATUSES, Field, DateRangeField, Icon, fmtPrice, cx } from "./TaskShared";

// ============================================================
// TaskApp・DemoApp共通の検索バー（ステータス・タグ・並び替え・
// 開閉式の詳細検索パネル・合計金額表示）。
//
// useTaskSearch()の戻り値をそのまま渡すだけで動作する。
// tags を渡した場合だけ、タグの絞り込みセレクトを表示する（デモは渡さない）。
// 見た目は app/components.css の共通クラスのみで構成する。
// ※ iOS Safariは16px未満の入力欄で自動ズームするため、selectにfontSizeを指定しない。
// ============================================================

type Props<T> = {
  search: UseTaskSearchResult<T>;
  tags?: { id: string; name: string }[];
};

export function TaskSearchBar<T>({ search, tags }: Props<T>) {
  const {
    filterStatus, setFilterStatus,
    filterTag, setFilterTag,
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
      <div className="container row" style={{ paddingTop: 16, gap: 8, flexWrap: "wrap" }}>
        {/* ステータス：プルダウン方式 */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="select"
          style={{ width: "auto", padding: "8px 14px", fontWeight: 600 }}>
          <option value="all">すべてのステータス</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        {/* タグ：プルダウン方式（タグが1つ以上あるときだけ） */}
        {tags && tags.length > 0 && (
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="select"
            aria-label="タグで絞り込み"
            style={{ width: "auto", padding: "8px 14px", fontWeight: 600 }}>
            <option value="all">すべてのタグ</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

        {/* 詳細検索の開閉ボタン */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cx("btn", "btn-sm", showFilters ? "btn-primary" : "btn-secondary")}
        >
          詳細検索
          {activeFilterCount > 0 && (
            <span style={{
              background: "rgba(255,255,255,0.25)", borderRadius: 999,
              fontSize: 10, fontWeight: 600, padding: "1px 6px", minWidth: 16, textAlign: "center"
            }}>
              {activeFilterCount}
            </span>
          )}
          <span style={{ display: "inline-flex", transition: "transform 0.15s", transform: showFilters ? "rotate(180deg)" : "none" }}>
            <Icon name="chevronDown" size={12} />
          </span>
        </button>

        {/* 並び替え */}
        <div className="row" style={{ gap: 6, marginLeft: "auto" }}>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as any)}
            className="select" style={{ width: "auto", padding: "7px 12px" }}>
            <option value="ordered_at">依頼日順</option>
            <option value="deadline">納期順</option>
            <option value="price">金額順</option>
            <option value="status">ステータス順</option>
          </select>
          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            className="btn btn-secondary btn-sm">
            {sortDir === "asc" ? "↑ 昇順" : "↓ 降順"}
          </button>
        </div>
      </div>

      {/* 詳細検索パネル（開閉式） */}
      {showFilters && (
        <div className="container" style={{ marginTop: 10 }}>
          <div className="panel" style={{ padding: "20px 22px", display: "grid", gap: 16 }}>
            <Field label="キーワード（件名・依頼先名・連絡先・メモ）">
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="例: バナー、田中デザイン"
                className="input"
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
              <DateRangeField label="依頼日" from={orderedFrom} to={orderedTo} onFromChange={setOrderedFrom} onToChange={setOrderedTo} />
              <DateRangeField label="納期" from={deadlineFrom} to={deadlineTo} onFromChange={setDeadlineFrom} onToChange={setDeadlineTo} />
            </div>

            <Field label="金額（円）">
              <div className="row" style={{ gap: 8 }}>
                <input
                  type="number" inputMode="numeric" value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="下限" className="input" style={{ flex: 1 }}
                />
                <span className="text-meta" style={{ flexShrink: 0 }}>〜</span>
                <input
                  type="number" inputMode="numeric" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder="上限" className="input" style={{ flex: 1 }}
                />
              </div>
            </Field>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showTotalPrice}
                onChange={e => setShowTotalPrice(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              検索結果の合計金額を表示する
            </label>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                onClick={clearAdvancedFilters}
                disabled={activeFilterCount === 0}
                className="btn btn-ghost btn-sm"
                style={{ color: activeFilterCount === 0 ? "var(--meta)" : "var(--accent)" }}>
                条件をクリア
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 合計金額（詳細検索パネルのチェックがオンの時だけ表示） */}
      {showTotalPrice && (
        <div className="container" style={{ marginTop: 10 }}>
          <div className="row" style={{
            padding: "10px 16px", background: "var(--accent-soft)", borderRadius: "var(--radius-md)",
            fontSize: 13, color: "var(--accent)", fontWeight: 600, justifyContent: "space-between", flexWrap: "wrap", gap: 6
          }}>
            <span>検索結果の合計金額</span>
            <span>{fmtPrice(totalPrice, "JPY")}（該当 {filtered.length} 件）</span>
          </div>
        </div>
      )}
    </>
  );
}
