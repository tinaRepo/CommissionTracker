'use client';

import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export function PageViewTracker() {
    const pathname = usePathname();
    const lastTrackedPath = useRef<string | null>(null);
    const trackPath = useCallback((path: string) => {
        if (path.startsWith('/share/')) return;
        if (lastTrackedPath.current === path || typeof window.gtag !== 'function') return;
        lastTrackedPath.current = path;
        window.gtag('config', 'G-VL43MH743Z', { page_path: path });
    }, []);

    useEffect(() => {
        trackPath(pathname);
    }, [pathname, trackPath]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/sw.js')
            .catch(error => console.error('service worker registration error:', error));
    }, []);

    if (pathname.startsWith('/share/')) return null;
    return (
        <>
            <Script
                src="https://www.googletagmanager.com/gtag/js?id=G-VL43MH743Z"
                strategy="lazyOnload"
                crossOrigin="anonymous"
                onReady={() => trackPath(pathname)}
            />
            <Script id="ga-init" strategy="lazyOnload">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    window.gtag = gtag;
                    gtag('js', new Date());
                    gtag('config', 'G-VL43MH743Z', { send_page_view: false });
                `}
            </Script>
            <Analytics />
        </>
    );
}
