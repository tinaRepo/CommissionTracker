"use client";

import { useMemo, useState } from "react";
import type { TaskStatus } from "@/lib/supabase";
import {
  WEEKDAY_LABELS, addDays, addMonths, formatDay, formatMonth, groupByDate, monthGrid, todayStr, weekOf,
} from "@/lib/calendar";
import { Icon, StatusBadge, cx } from "./TaskShared";

// ============================================================
// カレンダービュー（月・週）。納期（deadline）の日に、タスクを表示する。
// 月表示は「日ごとのドット（ステータス色）」+ 選択した日の一覧、
// 週表示は7日ぶんを縦に並べた一覧（スマホで見やすい）。
// 納期が未設定のタスクはカレンダーに載らない（件数だけ表示）。
// ============================================================

export type CalendarTask = {
  id: string;
  title: string;
  deadline?: string | null;
  status: TaskStatus;
  assignee_name: string;
};

type Props = {
  tasks: CalendarTask[];
  onSelect: (id: string) => void;
};

const isActive = (s: TaskStatus) => s !== "done" && s !== "cancelled";

export default function TaskCalendar({ tasks, onSelect }: Props) {
  const today = todayStr();
  const [mode, setMode] = useState<"month" | "week">("month");
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const byDate = useMemo(() => groupByDate(tasks), [tasks]);
  const noDeadline = useMemo(() => tasks.filter(t => !t.deadline).length, [tasks]);
  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const week = useMemo(() => weekOf(selected), [selected]);

  function move(delta: number) {
    if (mode === "month") {
      const next = addMonths(cursor.year, cursor.month, delta);
      setCursor(next);
    } else {
      const d = addDays(selected, delta * 7);
      setSelected(d);
      const [y, m] = d.split("-").map(Number);
      setCursor({ year: y, month: m - 1 });
    }
  }

  function goToday() {
    setSelected(today);
    const [y, m] = today.split("-").map(Number);
    setCursor({ year: y, month: m - 1 });
  }

  function pick(date: string) {
    setSelected(date);
    const [y, m] = date.split("-").map(Number);
    setCursor({ year: y, month: m - 1 });
  }

  const title = mode === "month"
    ? formatMonth(cursor.year, cursor.month)
    : `${formatDay(week[0].date)} 〜 ${formatDay(week[6].date)}`;

  const renderItems = (date: string) => {
    const list = byDate.get(date) ?? [];
    if (list.length === 0) return <div className="text-meta" style={{ padding: "6px 2px" }}>この日が納期のタスクはありません</div>;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {list.map(t => {
          const overdue = isActive(t.status) && date < today;
          return (
            <button key={t.id} onClick={() => onSelect(t.id)}
              className={cx("cal-item", !isActive(t.status) && "dim", overdue && "overdue")}>
              <span className="grow">
                <span style={{ display: "block", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <span className="text-meta" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.assignee_name}</span>
              </span>
              {overdue && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", flexShrink: 0 }}>期限超過</span>}
              <span style={{ flexShrink: 0 }}><StatusBadge status={t.status} /></span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="cal-head">
        <button className="btn btn-secondary btn-sm" onClick={() => move(-1)} aria-label="前へ"><Icon name="chevronLeft" size={14} /></button>
        <div className="cal-title">{title}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => move(1)} aria-label="次へ"><Icon name="chevronRight" size={14} /></button>
        <button className="btn btn-secondary btn-sm" onClick={goToday}>今日</button>
        <div className="seg" style={{ marginLeft: "auto" }}>
          <button className={mode === "month" ? "on" : ""} onClick={() => setMode("month")}>月</button>
          <button className={mode === "week" ? "on" : ""} onClick={() => setMode("week")}>週</button>
        </div>
      </div>

      {mode === "month" ? (
        <>
          <div className="cal-grid" role="grid" aria-label={title}>
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={w} className={cx("cal-dow", i === 0 && "sun", i === 6 && "sat")}>{w}</div>
            ))}
            {grid.flat().map(c => {
              const list = byDate.get(c.date) ?? [];
              const shown = list.slice(0, 3);
              return (
                <button key={c.date}
                  onClick={() => pick(c.date)}
                  aria-label={`${formatDay(c.date)} ${list.length}件`}
                  aria-pressed={c.date === selected}
                  className={cx("cal-cell", !c.inMonth && "out", c.isToday && "today", c.date === selected && "selected",
                    c.weekday === 0 && "sun", c.weekday === 6 && "sat")}>
                  <span className="cal-num">{c.day}</span>
                  <span className="cal-dots">
                    {shown.map(t => (
                      <span key={t.id}
                        className={cx("cal-dot", `cal-dot-${t.status}`, !isActive(t.status) && "dim", isActive(t.status) && c.date < today && "overdue")} />
                    ))}
                    {list.length > 3 && <span className="cal-more">+{list.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="cal-day-title">{formatDay(selected)}</div>
          {renderItems(selected)}
        </>
      ) : (
        <div>
          {week.map(c => (
            <div key={c.date} className={cx("cal-week-day", c.isToday && "today")}>
              <div className="cal-day-title" style={{ marginTop: 6 }}>
                {formatDay(c.date)}{c.isToday ? "（今日）" : ""}
              </div>
              {renderItems(c.date)}
            </div>
          ))}
        </div>
      )}

      {noDeadline > 0 && (
        <div className="text-meta" style={{ marginTop: 16 }}>納期が未設定のタスク {noDeadline} 件は、カレンダーに表示されません。</div>
      )}
    </div>
  );
}
