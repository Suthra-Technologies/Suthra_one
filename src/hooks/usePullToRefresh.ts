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
    // Require an intentional hard pull (140px)
    const threshold = options?.threshold ?? 140;
    const onRefresh = options?.onRefresh;

    const startX = useRef(0);
    const startY = useRef(0);
    const pulling = useRef(false);
    const isHardPullReady = useRef(false);
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
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.95);
            box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
            opacity: 0;
            transition: opacity 0.15s ease, transform 0.15s ease;
        `;
        // Spinner SVG
        el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="animation: ptr-spin 0.8s linear infinite;">
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

        // Check if any scrollable parent is not at the top
        const isScrollableAtTop = (target: EventTarget | null): boolean => {
            let el = target as HTMLElement | null;
            while (el && el !== document.body && el !== document.documentElement) {
                if (el.scrollTop > 0) {
                    return false;
                }
                el = el.parentElement;
            }
            const winScroll = window.scrollY || document.documentElement.scrollTop;
            return winScroll <= 0;
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) {
                pulling.current = false;
                return;
            }

            if (!isScrollableAtTop(e.target)) {
                pulling.current = false;
                return;
            }

            startX.current = e.touches[0].clientX;
            startY.current = e.touches[0].clientY;
            pulling.current = true;
            isHardPullReady.current = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!pulling.current || e.touches.length !== 1) return;

            // If user scrolled down inside a container during move, cancel
            if (!isScrollableAtTop(e.target)) {
                pulling.current = false;
                const indicator = getIndicator();
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
                return;
            }

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX.current;
            const diffY = currentY - startY.current;

            // Only track strict vertical downward gesture (avoid diagonal swipes)
            if (diffY <= 10 || Math.abs(diffY) < Math.abs(diffX) * 2.5) {
                const indicator = getIndicator();
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
                return;
            }

            // Resistance curve: require deep downward pull
            const pullDistance = Math.min((diffY - 10) * 0.35, threshold + 20);
            const indicator = getIndicator();

            // Only show indicator when pull is substantial (> 40px)
            if (pullDistance < 35) {
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
                isHardPullReady.current = false;
                return;
            }

            const progress = Math.min((pullDistance - 35) / (threshold - 35), 1);
            indicator.style.opacity = String(Math.min(progress, 1));
            indicator.style.top = `${Math.max(pullDistance - 15, 12)}px`;
            indicator.style.transform = `translateX(-50%) scale(${0.7 + progress * 0.3})`;
            isHardPullReady.current = progress >= 0.95;
        };

        const handleTouchEnd = () => {
            if (!pulling.current) return;
            pulling.current = false;

            const indicator = getIndicator();

            // Only refresh if hard pull reached the threshold
            if (isHardPullReady.current) {
                indicator.style.opacity = '1';
                indicator.style.top = '24px';
                indicator.style.transform = 'translateX(-50%) scale(1)';

                setTimeout(() => {
                    if (onRefresh) {
                        onRefresh();
                        setTimeout(() => {
                            indicator.style.opacity = '0';
                        }, 600);
                    } else {
                        window.location.reload();
                    }
                }, 300);
            } else {
                indicator.style.opacity = '0';
                indicator.style.top = '0px';
            }
            isHardPullReady.current = false;
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
