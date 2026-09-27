import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
    const publicPages = [
        ["/lp", 1.0],
        ["/pricing", 0.8],
        ["/guide", 0.7],
        ["/terms", 0.3],
        ["/privacy", 0.3],
        ["/tokusho", 0.3],
    ] as const;

    return publicPages.map(([path, priority]) => ({
        url: `${SITE_URL}${path}`,
        changeFrequency: "monthly",
        priority,
    }));
}