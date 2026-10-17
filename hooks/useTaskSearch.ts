"use client";

import { useMemo, useState } from "react";
import type { TaskStatus } from "@/lib/supabase";

// ============================================================
// TaskApp（本番）とDemoApp（デモ）で共通の検索・フィルタ・並び替え
// ロジックを1箇所にまとめたフック。
//
// 検索に使うフィールド（title/assignee_name/contact/ordered_at/deadline/price/
// status/notes/tag_ids）を持つ型ならそのまま使える（Task・DemoTaskとも可）。
// tag_ids は任意（デモにはタグが無いので省略できる）。
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
  tag_ids?: string[];
};

export type TaskSortKey = "ordered_at" | "deadline" | "price" | "status";
export type SortDir = "asc" | "desc";

export type UseTaskSearchResult<T> = {
  // ステータス・タグ・並び替え（常時表示のUI用）
  filterStatus: "all" | TaskStatus;
  setFilterStatus: (v: "all" | TaskStatus) => void;
  filterTag: "all" | string; // "all" またはタグID
  setFilterTag: (v: "all" | string) => void;
  sortKey: TaskSortKey;
  setSortKey: (v: TaskSortKey) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;

  // 詳細検索パネルの開閉・条件（開閉式UI用）
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  titleKeyword: string; setTitleKeyword: (v: string) => void;
  assigneeKeyword: string; setAssigneeKeyword: (v: string) => void;
  contactKeyword: string; setContactKeyword: (v: string) => void;
  notesKeyword: string; setNotesKeyword: (v: string) => void;
  detailTagIds: string[]; setDetailTagIds: (v: string[]) => void;
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
  const [filterTag, setFilterTag] = useState<"all" | string>("all");
  const [sortKey, setSortKey] = useState<TaskSortKey>("ordered_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [showFilters, setShowFilters] = useState(false);
  const [titleKeyword, setTitleKeyword] = useState("");
  const [assigneeKeyword, setAssigneeKeyword] = useState("");
  const [contactKeyword, setContactKeyword] = useState("");
  const [notesKeyword, setNotesKeyword] = useState("");
  const [detailTagIds, setDetailTagIds] = useState<string[]>([]);
  const [orderedFrom, setOrderedFrom] = useState("");
  const [orderedTo, setOrderedTo] = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showTotalPrice, setShowTotalPrice] = useState(false); // デフォルト非表示

  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? items : items.filter(t => t.status === filterStatus);
    if (filterTag !== "all") list = list.filter(t => (t.tag_ids ?? []).includes(filterTag));

    const titleKw = titleKeyword.trim().toLowerCase();
    const assigneeKw = assigneeKeyword.trim().toLowerCase();
    const contactKw = contactKeyword.trim().toLowerCase();
    const notesKw = notesKeyword.trim().toLowerCase();
    if (titleKw) list = list.filter(t => t.title.toLowerCase().includes(titleKw));
    if (assigneeKw) list = list.filter(t => t.assignee_name.toLowerCase().includes(assigneeKw));
    if (contactKw) list = list.filter(t => (t.contact ?? "").toLowerCase().includes(contactKw));
    if (notesKw) list = list.filter(t => (t.notes ?? "").toLowerCase().includes(notesKw));
    if (detailTagIds.length > 0) {
      list = list.filter(t => detailTagIds.some(id => (t.tag_ids ?? []).includes(id)));
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
  }, [items, filterStatus, filterTag, sortKey, sortDir, titleKeyword, assigneeKeyword, contactKeyword, notesKeyword, detailTagIds, orderedFrom, orderedTo, deadlineFrom, deadlineTo, priceMin, priceMax]);

  // 検索結果（filtered）の合計金額。「合計金額を表示」チェックがオンの時だけUIに出す。
  const totalPrice = useMemo(
    () => filtered.reduce((sum, t) => sum + (t.price ?? 0), 0),
    [filtered]
  );

  const activeFilterCount = [titleKeyword, assigneeKeyword, contactKeyword, notesKeyword, orderedFrom, orderedTo, deadlineFrom, deadlineTo, priceMin, priceMax]
    .filter(v => v.trim() !== "").length;
  const totalActiveFilterCount = activeFilterCount + (detailTagIds.length > 0 ? 1 : 0);

  function clearAdvancedFilters() {
    setTitleKeyword("");
    setAssigneeKeyword("");
    setContactKeyword("");
    setNotesKeyword("");
    setDetailTagIds([]);
    setOrderedFrom(""); setOrderedTo("");
    setDeadlineFrom(""); setDeadlineTo("");
    setPriceMin(""); setPriceMax("");
  }

  return {
    filterStatus, setFilterStatus,
    filterTag, setFilterTag,
    sortKey, setSortKey,
    sortDir, setSortDir,
    showFilters, setShowFilters,
    titleKeyword, setTitleKeyword,
    assigneeKeyword, setAssigneeKeyword,
    contactKeyword, setContactKeyword,
    notesKeyword, setNotesKeyword,
    detailTagIds, setDetailTagIds,
    orderedFrom, setOrderedFrom,
    orderedTo, setOrderedTo,
    deadlineFrom, setDeadlineFrom,
    deadlineTo, setDeadlineTo,
    priceMin, setPriceMin,
    priceMax, setPriceMax,
    showTotalPrice, setShowTotalPrice,
    filtered,
    totalPrice,
    activeFilterCount: totalActiveFilterCount,
    clearAdvancedFilters,
  };
}
