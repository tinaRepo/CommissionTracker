"use client";

import { useMemo, useState } from "react";
import type { CommissionStatus } from "@/lib/supabase";

// ============================================================
// CommissionApp（本番）とDemoApp（デモ）で共通の検索・フィルタ・並び替え
// ロジックを1箇所にまとめたフック。
//
// 対象データの型はCommission（本番）・DemoCommission（デモ）で微妙に
// 異なる（idやuser_id、imagesの型など）が、検索に使うフィールド
// （title/artist/x_id/ordered_at/deadline/price/status/notes）は
// 共通しているため、SearchableCommissionを満たす型であれば
// どちらでもそのまま使える。
//
// ============================================================

export type SearchableCommission = {
  title: string;
  artist: string;
  x_id?: string;
  ordered_at?: string;
  deadline?: string;
  price?: number;
  status: CommissionStatus;
  notes?: string;
};

export type CommissionSortKey = "ordered_at" | "deadline" | "price" | "status";
export type SortDir = "asc" | "desc";

export type UseCommissionSearchResult<T> = {
  // ステータス・並び替え（常時表示のUI用）
  filterStatus: "all" | CommissionStatus;
  setFilterStatus: (v: "all" | CommissionStatus) => void;
  sortKey: CommissionSortKey;
  setSortKey: (v: CommissionSortKey) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;

  // 詳細検索パネルの開閉・条件（開閉式UI用）
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  orderedFrom: string; setOrderedFrom: (v: string) => void;
  orderedTo: string; setOrderedTo: (v: string) => void;
  deadlineFrom: string; setDeadlineFrom: (v: string) => void;
  deadlineTo: string; setDeadlineTo: (v: string) => void;
  priceMin: string; setPriceMin: (v: string) => void;
  priceMax: string; setPriceMax: (v: string) => void;
  showTotalPrice: boolean; setShowTotalPrice: (v: boolean) => void;

  // 導出値
  filtered: T[];
  totalPrice: number;
  activeFilterCount: number;
  clearAdvancedFilters: () => void;
};

// --- 日付・金額のレンジ検索用ヘルパー ---
// 日付はISO形式（YYYY-MM-DD）文字列のまま比較すれば時系列順と一致するため、
// Dateオブジェクトへの変換なしで判定できる。from/toが未入力の側は無条件通過。
// ただし対象の日付・金額自体が未設定の項目は、レンジ検索の対象外として除外する。
function inDateRange(value: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

function inPriceRange(value: number | undefined, min: string, max: string): boolean {
  if (!min && !max) return true;
  if (value === undefined) return false;
  if (min && value < Number(min)) return false;
  if (max && value > Number(max)) return false;
  return true;
}

export function useCommissionSearch<T extends SearchableCommission>(items: T[]): UseCommissionSearchResult<T> {
  const [filterStatus, setFilterStatus] = useState<"all" | CommissionStatus>("all");
  const [sortKey, setSortKey] = useState<CommissionSortKey>("ordered_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // NOTE: 検索条件を並べすぎるとUXが低下するため、既定では折りたたんでおき
  // （showFilters=false）、必要な人だけ「詳細検索」ボタンで開いて使う。
  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState(""); // 件名・絵師名・X ID・メモのキーワード検索
  const [orderedFrom, setOrderedFrom] = useState("");
  const [orderedTo, setOrderedTo] = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showTotalPrice, setShowTotalPrice] = useState(false); // デフォルト非表示

  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? items : items.filter(c => c.status === filterStatus);

    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(kw) ||
        c.artist.toLowerCase().includes(kw) ||
        (c.x_id ?? "").toLowerCase().includes(kw) ||
        (c.notes ?? "").toLowerCase().includes(kw)
      );
    }
    list = list.filter(c => inDateRange(c.ordered_at, orderedFrom, orderedTo));
    list = list.filter(c => inDateRange(c.deadline, deadlineFrom, deadlineTo));
    list = list.filter(c => inPriceRange(c.price, priceMin, priceMax));

    return [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "ordered_at") { av = a.ordered_at ?? ""; bv = b.ordered_at ?? ""; }
      else if (sortKey === "deadline") { av = a.deadline ?? ""; bv = b.deadline ?? ""; }
      else if (sortKey === "price") { av = a.price ?? 0; bv = b.price ?? 0; }
      else if (sortKey === "status") {
        const order = ["pending", "rough", "progress", "done", "cancelled"];
        av = order.indexOf(a.status); bv = order.indexOf(b.status);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, filterStatus, sortKey, sortDir, keyword, orderedFrom, orderedTo, deadlineFrom, deadlineTo, priceMin, priceMax]);

  // 検索結果（filtered）の合計金額。「合計金額を表示」チェックがオンの時だけUIに出す。
  const totalPrice = useMemo(
    () => filtered.reduce((sum, c) => sum + (c.price ?? 0), 0),
    [filtered]
  );

  // 詳細検索パネルを閉じていても「何か条件が効いている」ことが分かるよう、
  // 開閉ボタンにアクティブな検索条件の件数をバッジ表示する
  const activeFilterCount = [keyword, orderedFrom, orderedTo, deadlineFrom, deadlineTo, priceMin, priceMax]
    .filter(v => v.trim() !== "").length;

  function clearAdvancedFilters() {
    setKeyword("");
    setOrderedFrom(""); setOrderedTo("");
    setDeadlineFrom(""); setDeadlineTo("");
    setPriceMin(""); setPriceMax("");
  }

  return {
    filterStatus, setFilterStatus,
    sortKey, setSortKey,
    sortDir, setSortDir,
    showFilters, setShowFilters,
    keyword, setKeyword,
    orderedFrom, setOrderedFrom,
    orderedTo, setOrderedTo,
    deadlineFrom, setDeadlineFrom,
    deadlineTo, setDeadlineTo,
    priceMin, setPriceMin,
    priceMax, setPriceMax,
    showTotalPrice, setShowTotalPrice,
    filtered,
    totalPrice,
    activeFilterCount,
    clearAdvancedFilters,
  };
}
