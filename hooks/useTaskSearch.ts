"use client";

import { useMemo, useState } from "react";
import type { TaskStatus } from "@/lib/supabase";

// ============================================================
// TaskApp（本番）とDemoApp（デモ）で共通の検索・フィルタ・並び替え
// ロジックを1箇所にまとめたフック。
//
// 旧useCommissionSearch.tsから、汎用的な納期管理サービス「ツクリスト」向けに
// リネーム・用語変更したもの（artist→assignee_name、x_id→contact）。
//
// 対象データの型はTask（本番）・DemoTask（デモ）で微妙に
// 異なる（idやuser_id、imagesの型など）が、検索に使うフィールド
// （title/assignee_name/contact/ordered_at/deadline/price/status/notes）は
// 共通しているため、SearchableTaskを満たす型であればどちらでもそのまま使える。
//
// ============================================================

export type SearchableTask = {
  title: string;
  assignee_name: string;
  contact?: string;
  ordered_at?: string;
  deadline?: string;
  price?: number;
  status: TaskStatus;
  notes?: string;
};

export type TaskSortKey = "ordered_at" | "deadline" | "price" | "status";
export type SortDir = "asc" | "desc";

export type UseTaskSearchResult<T> = {
  // ステータス・並び替え（常時表示のUI用）
  filterStatus: "all" | TaskStatus;
  setFilterStatus: (v: "all" | TaskStatus) => void;
  sortKey: TaskSortKey;
  setSortKey: (v: TaskSortKey) => void;
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

export function useTaskSearch<T extends SearchableTask>(items: T[]): UseTaskSearchResult<T> {
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [sortKey, setSortKey] = useState<TaskSortKey>("ordered_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState(""); // 件名・依頼先名・連絡先・メモのキーワード検索
  const [orderedFrom, setOrderedFrom] = useState("");
  const [orderedTo, setOrderedTo] = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showTotalPrice, setShowTotalPrice] = useState(false); // デフォルト非表示

  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? items : items.filter(t => t.status === filterStatus);

    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(kw) ||
        t.assignee_name.toLowerCase().includes(kw) ||
        (t.contact ?? "").toLowerCase().includes(kw) ||
        (t.notes ?? "").toLowerCase().includes(kw)
      );
    }
    list = list.filter(t => inDateRange(t.ordered_at, orderedFrom, orderedTo));
    list = list.filter(t => inDateRange(t.deadline, deadlineFrom, deadlineTo));
    list = list.filter(t => inPriceRange(t.price, priceMin, priceMax));

    return [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "ordered_at") { av = a.ordered_at ?? ""; bv = b.ordered_at ?? ""; }
      else if (sortKey === "deadline") { av = a.deadline ?? ""; bv = b.deadline ?? ""; }
      else if (sortKey === "price") { av = a.price ?? 0; bv = b.price ?? 0; }
      else if (sortKey === "status") {
        const order = ["pending", "checking", "progress", "done", "cancelled"];
        av = order.indexOf(a.status); bv = order.indexOf(b.status);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, filterStatus, sortKey, sortDir, keyword, orderedFrom, orderedTo, deadlineFrom, deadlineTo, priceMin, priceMax]);

  // 検索結果（filtered）の合計金額。「合計金額を表示」チェックがオンの時だけUIに出す。
  const totalPrice = useMemo(
    () => filtered.reduce((sum, t) => sum + (t.price ?? 0), 0),
    [filtered]
  );

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
