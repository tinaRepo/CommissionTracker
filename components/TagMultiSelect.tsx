"use client";

type TagOption = { id: string; name: string };

type Props = {
  tags: TagOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  ariaLabel: string;
  placeholder?: string;
};

export function TagMultiSelect({ tags, selectedIds, onChange, ariaLabel, placeholder = "タグを選択" }: Props) {
  const selectedNames = tags.filter(tag => selectedIds.includes(tag.id)).map(tag => tag.name);

  return (
    <details style={{ position: "relative" }}>
      <summary
        className="select tag-multi-select-summary"
        aria-label={ariaLabel}
        title={selectedNames.join("、") || placeholder}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedNames.length > 0 ? selectedNames.join("、") : placeholder}
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, marginLeft: 8 }}>▾</span>
      </summary>
      <div style={{
        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
        display: "grid", gap: 2, maxHeight: 220, overflowY: "auto", padding: 6,
        border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
        background: "var(--bg)", boxShadow: "var(--shadow-md)",
      }}>
        {tags.map(tag => (
          <label key={tag.id} style={{
            display: "flex", alignItems: "center", gap: 9, minHeight: 38,
            padding: "6px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={selectedIds.includes(tag.id)}
              onChange={event => onChange(
                event.target.checked
                  ? [...selectedIds, tag.id]
                  : selectedIds.filter(id => id !== tag.id)
              )}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tag.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
