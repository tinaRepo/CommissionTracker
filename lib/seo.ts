import type { Metadata } from "next";

export { SITE_URL } from "@/lib/site";

export function createPublicPageMetadata(title: string, description: string, pathname: string): Metadata {
    return {
        title: { absolute: `${title} | ツクリスト` },
        description,
        alternates: { canonical: pathname },
        openGraph: {
            type: "website",
            locale: "ja_JP",
            siteName: "ツクリスト",
            title: `${title} | ツクリスト`,
            description,
            url: pathname,
            images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "ツクリスト" }],
        },
        twitter: { card: "summary", title: `${title} | ツクリスト`, description },
    };
}

export const noIndexMetadata: Metadata = {
    robots: { index: false, follow: false },
};
