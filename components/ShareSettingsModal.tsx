"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Icon } from "./TaskShared";

type ShareSettings = {
  share_token: string;
  enabled: boolean;
  show_accepting_status: boolean;
  accepting_requests: boolean;
  show_active_count: boolean;
  show_completed_count: boolean;
  show_capacity: boolean;
  capacity: number;
  show_display_name: boolean;
  display_name: string;
  show_bio: boolean;
  bio: string;
  show_social_link: boolean;
  social_link: string;
  show_portfolio: boolean;
};

type ShareImage = {
  id: string;
  fileName: string;
  imageType: string | null;
  taskTitle: string;
  previewUrl: string | null;
};

type Props = { open: boolean; onClose: () => void };

const EMPTY_SETTINGS: Omit<ShareSettings, "share_token"> = {
  enabled: false,
  show_accepting_status: false,
  accepting_requests: false,
  show_active_count: false,
  show_completed_count: false,
  show_capacity: false,
  capacity: 0,
  show_display_name: false,
  display_name: "",
  show_bio: false,
  bio: "",
  show_social_link: false,
  social_link: "",
  show_portfolio: false,
};

export default function ShareSettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Omit<ShareSettings, "share_token">>(EMPTY_SETTINGS);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [galleryImageIds, setGalleryImageIds] = useState<string[]>([]);
  const [images, setImages] = useState<ShareImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<ShareImage[]>([]);
  const [imagesPage, setImagesPage] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("ログイン状態を確認できませんでした。再ログインしてください。");
        const response = await fetch("/api/share/settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error === "premium_required"
          ? "共有ページはプレミアムプランで利用できます。"
          : result.error ?? "共有設定を読み込めませんでした。");
        if (!cancelled) {
          setImages(result.images ?? []);
          setSelectedImages(result.selectedImages ?? []);
          setGalleryImageIds(result.galleryImageIds ?? []);
          setImagesPage(result.imagesPage ?? 0);
          setHasMoreImages(!!result.hasMoreImages);
          setDeleted(false);
        }
        if (!cancelled && result.settings) {
          const { share_token, ...savedSettings } = result.settings as ShareSettings;
          setToken(share_token);
          setSettings(savedSettings);
        } else if (!cancelled) {
          setToken(null);
          setSettings(EMPTY_SETTINGS);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "共有設定を読み込めませんでした。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  function shareUrl(value = token) {
    return value ? `${window.location.origin}/share/${encodeURIComponent(value)}` : "";
  }

  async function request(method: "POST" | "DELETE", body?: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("ログイン状態を確認できませんでした。再ログインしてください。");
    const response = await fetch("/api/share/settings", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error === "premium_required"
      ? "共有ページはプレミアムプランで利用できます。"
      : result.error ?? "共有設定を保存できませんでした。");
    return result;
  }

  async function loadMoreImages() {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ログイン状態を確認できませんでした。再ログインしてください。");
      const nextPage = imagesPage + 1;
      const response = await fetch("/api/share/settings?imagesPage=" + nextPage, {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "画像一覧を読み込めませんでした。");
      setImages(current => [...current, ...(result.images ?? [])]);
      setImagesPage(nextPage);
      setHasMoreImages(!!result.hasMoreImages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "画像一覧を読み込めませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setCopied(false);
    try {
      const result = await request("POST", { ...settings, galleryImageIds });
      const saved = result.settings as ShareSettings;
      const { share_token, ...savedSettings } = saved;
      setToken(share_token);
      setSettings(savedSettings);
      setGalleryImageIds(result.galleryImageIds ?? []);
      setDeleted(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "共有設定を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!window.confirm("現在の共有リンクを無効にし、新しいリンクを発行します。続けますか？")) return;
    setSaving(true);
    setError(null);
    setCopied(false);
    try {
      const result = await request("POST", { action: "regenerate" });
      const saved = result.settings as ShareSettings;
      const { share_token, ...savedSettings } = saved;
      setToken(share_token);
      setSettings(savedSettings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "共有リンクを再発行できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function deletePage() {
    if (!window.confirm("共有ページと現在の共有リンクを削除します。リンクは無効になります。続けますか？")) return;
    setSaving(true);
    setError(null);
    try {
      await request("DELETE");
      setToken(null);
      setSettings(EMPTY_SETTINGS);
      setGalleryImageIds([]);
      setSelectedImages([]);
      setDeleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "共有ページを削除できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("リンクをコピーできませんでした。リンクを選択してコピーしてください。");
    }
  }

  function toggle(field: keyof typeof settings, value: boolean) {
    setSettings(current => ({ ...current, [field]: value }));
  }

  function toggleGalleryImage(imageId: string) {
    setGalleryImageIds(current => {
      if (current.includes(imageId)) return current.filter(id => id !== imageId);
      if (current.length >= 20) {
        setError("実績画像は20枚まで選択できます。");
        return current;
      }
      setError(null);
      return [...current, imageId];
    });
  }

  const checkboxStyle = { display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer" };
  const dividerStyle = { borderTop: "1px solid var(--divider)", paddingTop: 16, marginTop: 16 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="共有ページ設定" className="modal-sheet"
        style={{ maxWidth: 700 }} onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>共有ページ設定</div>
              <div className="text-meta" style={{ marginTop: 4 }}>公開する情報だけ選択してください</div>
            </div>
            <button onClick={onClose} className="icon-btn" aria-label="閉じる"
              style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)" }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {loading ? <div className="text-meta">設定を読み込み中…</div> : (
            <div style={{ display: "grid", gap: 14 }}>
              {error && (
                <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--danger-soft)", color: "var(--danger)", fontSize: 13 }}>
                  {error}
                </div>
              )}
              {deleted && <div role="status" className="text-meta">共有ページを削除しました。以前のリンクは無効です。</div>}
              <label style={{ ...checkboxStyle, fontWeight: 600 }}>
                <input type="checkbox" checked={settings.enabled} onChange={event => toggle("enabled", event.target.checked)} />
                共有ページを公開する
              </label>
              <p className="text-meta" style={{ margin: "-8px 0 0 25px" }}>
                オフにするとリンクを知っている人も閲覧できません。検索エンジンには登録しません。
              </p>

              <div style={dividerStyle}>
                <div className="field-label" style={{ marginBottom: 12 }}>受付・実績</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_accepting_status} onChange={event => toggle("show_accepting_status", event.target.checked)} />
                    受付状況を公開
                  </label>
                  {settings.show_accepting_status && (
                    <label style={{ ...checkboxStyle, marginLeft: 25 }}>
                      <input type="checkbox" checked={settings.accepting_requests} onChange={event => toggle("accepting_requests", event.target.checked)} />
                      現在、依頼を受け付けている
                    </label>
                  )}
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_active_count} onChange={event => toggle("show_active_count", event.target.checked)} />
                    現在対応中のタスク件数を公開
                  </label>
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_completed_count} onChange={event => toggle("show_completed_count", event.target.checked)} />
                    完了済みタスク件数を公開
                  </label>
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_capacity} onChange={event => toggle("show_capacity", event.target.checked)} />
                    受付可能件数を公開
                  </label>
                  {settings.show_capacity && (
                    <div style={{ marginLeft: 25 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        同時に受け付ける上限
                        <input type="number" min={0} max={1000} value={settings.capacity}
                          onChange={event => setSettings(current => ({ ...current, capacity: Number(event.target.value) }))}
                          className="input" style={{ width: 100 }} />
                        件
                      </label>
                      <p className="text-meta" style={{ marginTop: 6 }}>
                        受付可能件数は、この上限から現在対応中のタスク件数を引いて表示します。
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={dividerStyle}>
                <div className="field-label" style={{ marginBottom: 12 }}>プロフィール</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_display_name} onChange={event => toggle("show_display_name", event.target.checked)} />
                    表示名を公開
                  </label>
                  {settings.show_display_name && (
                    <input value={settings.display_name} maxLength={80} placeholder="公開する表示名"
                      onChange={event => setSettings(current => ({ ...current, display_name: event.target.value }))}
                      className="input" />
                  )}
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_bio} onChange={event => toggle("show_bio", event.target.checked)} />
                    紹介文を公開
                  </label>
                  {settings.show_bio && (
                    <textarea value={settings.bio} maxLength={500} placeholder="活動内容や依頼者向けの案内（500文字まで）"
                      onChange={event => setSettings(current => ({ ...current, bio: event.target.value }))}
                      className="textarea" style={{ minHeight: 90 }} />
                  )}
                  <label style={checkboxStyle}>
                    <input type="checkbox" checked={settings.show_social_link} onChange={event => toggle("show_social_link", event.target.checked)} />
                    SNSリンクを公開
                  </label>
                  {settings.show_social_link && (
                    <input type="url" value={settings.social_link} maxLength={2048} placeholder="https://…"
                      onChange={event => setSettings(current => ({ ...current, social_link: event.target.value }))}
                      className="input" />
                  )}
                </div>
              </div>

              <div style={dividerStyle}>
                <div className="field-label" style={{ marginBottom: 12 }}>実績画像</div>
                <label style={checkboxStyle}>
                  <input type="checkbox" checked={settings.show_portfolio} onChange={event => toggle("show_portfolio", event.target.checked)} />
                  選択した画像を実績として公開
                </label>
                {settings.show_portfolio && (
                  <div style={{ marginTop: 12 }}>
                    <p className="text-meta" style={{ lineHeight: 1.6 }}>
                      タスクに添付した画像から最大20枚選べます。画像だけが公開され、タスク名などは公開されません。選択中: {galleryImageIds.length}/20
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginTop: 10 }}>
                      {Array.from(new Map([...selectedImages, ...images].map(image => [image.id, image])).values()).map(image => (
                        <label key={image.id} style={{ cursor: "pointer", border: galleryImageIds.includes(image.id) ? "1px solid var(--primary)" : "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: 8, background: galleryImageIds.includes(image.id) ? "var(--primary-soft)" : "var(--surface)" }}>
                          <input type="checkbox" checked={galleryImageIds.includes(image.id)} onChange={() => toggleGalleryImage(image.id)} />
                          {image.previewUrl && <img src={image.previewUrl} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, marginTop: 6 }} />}
                          <span className="text-meta" style={{ display: "block", marginTop: 5, overflowWrap: "anywhere" }}>{image.fileName}</span>
                          <span className="text-meta" style={{ display: "block", overflowWrap: "anywhere" }}>{image.taskTitle}</span>
                        </label>
                      ))}
                    </div>
                    {images.length === 0 && <p className="text-meta" style={{ marginTop: 10 }}>選択できる添付画像がありません。</p>}
                    {hasMoreImages && (
                      <button onClick={loadMoreImages} disabled={saving} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
                        さらに画像を読み込む
                      </button>
                    )}
                  </div>
                )}
              </div>

              {token && (
                <div style={dividerStyle}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <div className="field-label">共有リンク</div>
                    <span className="text-meta" style={{ color: settings.enabled ? "var(--success)" : "var(--muted)", fontWeight: 600 }}>
                      {settings.enabled ? "公開中" : "非公開"}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
                    <input readOnly value={shareUrl()} className="input" aria-label="共有リンク" />
                    <button onClick={copyLink} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                      <Icon name={copied ? "check" : "link"} size={14} />{copied ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                  <button onClick={regenerate} disabled={saving} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                    リンクを再発行（現在のリンクを無効化）
                  </button>
                  <button onClick={deletePage} disabled={saving} className="btn btn-ghost btn-sm" style={{ display: "block", marginTop: 4, color: "var(--danger)" }}>
                    共有ページを削除
                  </button>
                </div>
              )}

              <div style={{ padding: 12, background: "var(--warn-soft)", color: "var(--warn)", borderRadius: "var(--radius-md)", fontSize: 12, lineHeight: 1.7 }}>
                共有リンクを知っている人はログインなしで閲覧できます。リンクはSNS等で公開される場合があります。選択した実績画像以外のタスク情報やアカウント情報は公開しません。
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>閉じる</button>
            <button onClick={save} disabled={loading || saving} className="btn btn-primary" style={{ flex: 2 }}>
              {saving ? "保存中…" : "設定を保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
