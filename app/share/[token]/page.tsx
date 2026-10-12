"use client";

import { useEffect, useState } from "react";

type PublicShare = {
  acceptingRequests?: boolean;
  activeCount?: number;
  availableSlots?: number;
  completedCount?: number;
  displayName?: string;
  bio?: string;
  socialLink?: string;
};

export default function PublicSharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicShare | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public-share/${encodeURIComponent(params.token)}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("共有ページを表示できません");
        return response.json() as Promise<PublicShare>;
      })
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, [params.token]);

  if (unavailable) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--surface)" }}>
        <section className="card" style={{ maxWidth: 480, width: "100%", padding: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 10 }}>共有ページを表示できません</h1>
          <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
            リンクが無効になっているか、公開が停止されています。
          </p>
        </section>
      </main>
    );
  }
  if (!data) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--surface)" }}>
        <p className="text-muted">共有ページを読み込み中…</p>
      </main>
    );
  }

  const socialUrl = data.socialLink ? safeSocialUrl(data.socialLink) : null;
  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", background: "var(--surface)" }}>
      <article className="card" style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px, 6vw, 40px)" }}>
        <div className="text-meta" style={{ fontWeight: 600, marginBottom: 14 }}>ツクリスト | 共有ページ</div>
        {data.displayName && <h1 style={{ fontSize: 28, lineHeight: 1.4, margin: "0 0 12px" }}>{data.displayName}</h1>}
        {data.bio && <p style={{ color: "var(--fg-2)", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: "0 0 24px" }}>{data.bio}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {typeof data.acceptingRequests === "boolean" && (
            <Metric label="依頼受付" value={data.acceptingRequests ? "受付中" : "受付停止中"} />
          )}
          {typeof data.activeCount === "number" && <Metric label="現在対応中" value={`${data.activeCount}件`} />}
          {typeof data.availableSlots === "number" && <Metric label="受付可能" value={`${data.availableSlots}件`} />}
          {typeof data.completedCount === "number" && <Metric label="累計完了" value={`${data.completedCount}件`} />}
        </div>

        {socialUrl && (
          <p style={{ marginTop: 24 }}>
            <a href={socialUrl} target="_blank" rel="noopener noreferrer nofollow"
              className="btn btn-secondary" style={{ textDecoration: "none" }}>
              SNS・プロフィールを見る
            </a>
          </p>
        )}
        <footer className="text-meta" style={{ marginTop: 32, textAlign: "center" }}>
          Powered by ツクリスト
        </footer>
      </article>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-2, var(--bg))" }}>
      <div className="text-meta" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function safeSocialUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
