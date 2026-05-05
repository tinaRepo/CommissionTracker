'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function PageViewTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window.gtag === 'function') {
            window.gtag('config', 'G-VL43MH743Z', {
                page_path: pathname,
            });
        }
    }, [pathname]);

    return null;
}