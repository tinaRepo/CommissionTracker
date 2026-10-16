import { getPublicShareData, type PublicShareData } from "@/lib/server/public-share";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({ params }: { params: { token: string } }) {
  let data: PublicShareData | null;
  try {
    data = await getPublicShareData(params.token);
  } catch (error) {
    console.error("public share page load failed", error);
    return <UnavailablePage />;
  }

  if (!data) return <UnavailablePage />;
  if (data.state === "unpublished") {
    return (
      <StatusPage
        title="現在は非公開設定です"
        message="この共有ページは現在公開されていません。"
      />
    );
  }

  const socialLinks = (data.socialLinks ?? [])
    .map(value => {
      const url = safeSocialUrl(value);
      return url ? { url, host: new URL(url).hostname } : null;
    })
    .filter((link): link is { url: string; host: string } => link !== null);

  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", background: "var(--surface)" }}>
      <article className="share-page-content demo-share-page" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="text-meta" style={{ fontWeight: 600, marginBottom: 14 }}>ツクリスト | 共有ページ</div>
        {data.displayName && <h1 style={{ fontSize: 28, lineHeight: 1.4, margin: "0 0 12px" }}>{data.displayName}</h1>}
        {data.bio && <p style={{ color: "var(--fg-2)", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: "0 0 24px" }}>{data.bio}</p>}

        <div className="share-page-metrics">
          {typeof data.acceptingRequests === "boolean" && (
            <Metric label="依頼受付" value={data.acceptingRequests ? "受付中" : "受付停止中"} />
          )}
          {typeof data.activeCount === "number" && <Metric label="現在対応中" value={`${data.activeCount}件`} />}
          {typeof data.availableSlots === "number" && <Metric label="受付可能" value={`${data.availableSlots}件`} />}
          {typeof data.completedCount === "number" && <Metric label="累計完了" value={`${data.completedCount}件`} />}
        </div>

        {socialLinks.length > 0 && (
          <div className="share-page-social-links">
            {socialLinks.map(({ url, host }) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow"
                className="btn btn-secondary share-page-social-link" style={{ textDecoration: "none" }}>
                <span className="share-page-social-host">{host} のプロフィールを見る ↗</span>
              </a>
            ))}
          </div>
        )}
        {data.galleryImages && data.galleryImages.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>実績</h2>
            <div className="share-page-gallery">
              {data.galleryImages.map(image => (
                <figure key={image.id} style={{ minWidth: 0 }}>
                  <div style={{ position: "relative", aspectRatio: "1" }}>
                    <Image src={image.url} alt={image.caption || "制作実績"} fill sizes="(max-width: 640px) 50vw, 300px"
                      style={{ objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                  </div>
                  {image.caption && <figcaption className="text-meta" style={{ marginTop: 6, overflowWrap: "anywhere" }}>{image.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
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

function UnavailablePage() {
  return (
    <StatusPage
      title="共有ページを表示できません"
      message="リンクが無効になっているか、公開が停止されています。"
    />
  );
}

function StatusPage({ title, message }: { title: string; message: string }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--surface)" }}>
      <section className="card" style={{ maxWidth: 480, width: "100%", padding: 28, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>{title}</h1>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>{message}</p>
      </section>
    </main>
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
