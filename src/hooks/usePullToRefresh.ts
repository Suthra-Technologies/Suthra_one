import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Pull-to-refresh hook for mobile (Capacitor) platforms.
 *
 * When the user is at the top of the page and pulls down past a threshold,
 * a visual indicator appears and the page is reloaded on release.
 *
 * Only activates on native platforms (iOS / Android).
 *
 * @param options.threshold – distance (px) the user must pull to trigger refresh (default 80)
 * @param options.onRefresh – optional custom callback instead of page reload
 */
export function usePullToRefresh(options?: {
    threshold?: number;
    onRefresh?: () => void;
}) {
    const threshold = options?.threshold ?? 80;
    const onRefresh = options?.onRefresh;

    const startY = useRef(0);
    const pulling = useRef(false);
    const indicatorRef = useRef<HTMLDivElement | null>(null);

    const isNative = Capacitor.isNativePlatform();

    // Create and manage the visual indicator element
    const getIndicator = useCallback(() => {
        if (indicatorRef.current) return indicatorRef.current;

        const el = document.createElement('div');
        el.id = 'ptr-indicator';
        el.style.cssText = `
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.95);
            box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
            opacity: 0;
            transition: opacity 0.15s ease;
        `;
        // Spinner SVG
        el.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="animation: ptr-spin 0.8s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="40 60" stroke-linecap="round"/>
        </svg>`;

        // Add keyframe animation
        if (!document.getElementById('ptr-style')) {
            const style = document.createElement('style');
            style.id = 'ptr-style';
            style.textContent = `@keyframes ptr-spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        document.body.appendChild(el);
        indicatorRef.current = el;
        return el;
    }, []);

    useEffect(() => {
        if (!isNative) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only activate when scrolled to the very top
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            if (scrollTop <= 0) {
                startY.current = e.touches[0].clientY;
                pulling.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!pulling.current) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            // Only act on downward pull
            if (diff <= 0) {
                const indicator = getIndicator();
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
                return;
            }

            // Apply a dampening factor so it feels natural
            const pullDistance = Math.min(diff * 0.4, threshold + 30);
            const indicator = getIndicator();

            // Show indicator with progress
            const progress = Math.min(pullDistance / threshold, 1);
            indicator.style.opacity = String(Math.min(progress, 1));
            indicator.style.top = `${Math.max(pullDistance - 10, 8)}px`;
            indicator.style.transform = `translateX(-50%) scale(${0.6 + progress * 0.4})`;
        };

        const handleTouchEnd = () => {
            if (!pulling.current) return;
            pulling.current = false;

            const indicator = getIndicator();
            const currentTop = parseFloat(indicator.style.top || '0');

            // Check if user pulled past threshold
            if (currentTop >= threshold * 0.4 - 10) {
                // Show loading state briefly, then refresh
                indicator.style.opacity = '1';
                indicator.style.top = '16px';
                indicator.style.transform = 'translateX(-50%) scale(1)';

                setTimeout(() => {
                    if (onRefresh) {
                        onRefresh();
                        // Clean up indicator after custom refresh
                        setTimeout(() => {
                            indicator.style.opacity = '0';
                        }, 600);
                    } else {
                        window.location.reload();
                    }
                }, 300);
            } else {
                // Didn't pull far enough – reset
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);

            // Clean up DOM elements
            if (indicatorRef.current) {
                indicatorRef.current.remove();
                indicatorRef.current = null;
            }
        };
    }, [isNative, threshold, onRefresh, getIndicator]);
}
