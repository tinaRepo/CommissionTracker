import type { Metadata } from "next";

export const SITE_URL = "https://commission-tracker-nine.vercel.app";

export function createPublicPageMetadata(title: string, description: string, pathname: string): Metadata {
    return {
        title: { absolute: `${title} | Commission Tracker` },
        description,
        alternates: { canonical: pathname },
        openGraph: {
            type: "website",
            locale: "ja_JP",
            siteName: "Commission Tracker",
            title: `${title} | Commission Tracker`,
            description,
            url: pathname,
            images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "Commission Tracker" }],
        },
        twitter: { card: "summary", title: `${title} | Commission Tracker`, description },
    };
}

export const noIndexMetadata: Metadata = {
    robots: { index: false, follow: false },
};