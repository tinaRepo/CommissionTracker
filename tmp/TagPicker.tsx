"use client";

import { useState } from "react";
import { TAGS_PER_TASK_LIMIT, TAG_NAME_MAX_LENGTH, normalizeTagName, type Tag } from "@/lib/supabase";
import { Icon, cx } from "./TaskShared";

// ============================================================
// タグの選択UI（タスクのフォーム内で使う）と、タグの管理モーダル
// ============================================================

type PickerProps = {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<Tag>;
};

export function TagPicker({ tags, selectedIds, onChange, onCreate }: PickerProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = selectedIds.length >= TAGS_PER_TASK_LIMIT;

  function toggle(id: string) {
    setError(null);
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else if (atLimit) {
      setError(`1つのタスクに付けられるタグは${TAGS_PER_TASK_LIMIT}個までです`);
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function add() {
    const name = normalizeTagName(input);
    if (!name || busy) return;
    setError(null);
    if (atLimit) { setError(`1つのタスクに付けられるタグは${TAGS_PER_TASK_LIMIT}個までです`); return; }

    // 同じ名前（大文字小文字の違いを除く）の既存タグがあれば、新規作成せずそれを選択する
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id]);
      setInput("");
      return;
    }
    setBusy(true);
    try {
      const created = await onCreate(name);
      onChange([...selectedIds, created.id]);
      setInput("");
    } catch (e: any) {
      setError(e?.message ?? "タグを作成できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {tags.map(t => {
            const on = selectedIds.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)}
                className={cx("tag-chip", on && "on")}>
                {on && <Icon name="check" size={12} />}{t.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
          maxLength={TAG_NAME_MAX_LENGTH}
          placeholder="新しいタグ（例: 緊急、A社）"
          className="input"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={add} disabled={!input.trim() || busy} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
          <Icon name="plus" size={14} /> 追加
        </button>
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: "var(--danger)" }}>{error}</div>}
      <div className="text-meta" style={{ marginTop: 6 }}>{selectedIds.length} / {TAGS_PER_TASK_LIMIT} 個選択中</div>
    </div>
  );
}

// ---- タグの管理（名前の変更・削除） ----
type ManagerProps = {
  open: boolean;
  tags: Tag[];
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TagManagerModal({ open, tags, onClose, onRename, onDelete }: ManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function run(id: string, fn: () => Promise<void>) {
    setBusyId(id); setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message ?? "処理に失敗しました"); } finally { setBusyId(null); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="タグを管理" className="modal-sheet" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 17 }}>タグを管理</span>
            <button onClick={onClose} className="icon-btn" aria-label="閉じる"
              style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)", width: 32, height: 32 }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
        <div className="modal-body" style={{ paddingBottom: 16 }}>
          {error && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
          {tags.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--meta)", fontSize: 14 }}>
              タグはまだありません。タスクの編集画面から作成できます。
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {tags.map(t => (
                <div key={t.id} className="card row" style={{ padding: "10px 12px", gap: 8 }}>
                  {editingId === t.id ? (
                    <>
                      <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={TAG_NAME_MAX_LENGTH}
                        onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) run(t.id, async () => { await onRename(t.id, draft); setEditingId(null); }); }}
                        className="input" style={{ flex: 1, minHeight: 36, padding: "6px 10px" }} />
                      <button className="btn btn-primary btn-sm" disabled={busyId === t.id || !draft.trim()}
                        onClick={() => run(t.id, async () => { await onRename(t.id, draft); setEditingId(null); })}>保存</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>戻る</button>
                    </>
                  ) : confirmId === t.id ? (
                    <>
                      <span className="grow" style={{ fontSize: 13 }}>「{t.name}」を削除しますか？（タスクは残ります）</span>
                      <button className="btn btn-danger-solid btn-sm" disabled={busyId === t.id}
                        onClick={() => run(t.id, async () => { await onDelete(t.id); setConfirmId(null); })}>削除</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>戻る</button>
                    </>
                  ) : (
                    <>
                      <span className="grow" style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                      <button className="icon-btn" aria-label={`${t.name}の名前を変更`} onClick={() => { setEditingId(t.id); setDraft(t.name); setConfirmId(null); }}
                        style={{ background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border-soft)", width: 32, height: 32 }}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="icon-btn" aria-label={`${t.name}を削除`} onClick={() => { setConfirmId(t.id); setEditingId(null); }}
                        style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "none", width: 32, height: 32 }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary btn-block">閉じる</button>
        </div>
      </div>
    </div>
  );
}
