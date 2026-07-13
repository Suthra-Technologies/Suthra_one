/**
 * Notification sound catalogue — backed by the real MP3 files in
 * src/assets/sounds/. Admin selects a sound in Settings; the choice is
 * stored in localStorage('notificationSoundId') and read by
 * NotificationProvider on every alert.
 */

import { NativeAudio } from '@capacitor-community/native-audio';
import { Capacitor } from '@capacitor/core';

export interface NotificationSound {
    id: string;
    label: string;
    emoji: string;
    src: string; // URL for web
    nativePath: string; // Path for NativeAudio
}

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
    { id: 'notification',    label: 'Default Notification', emoji: '🔔', src: '/sounds/notification.mp3', nativePath: 'public/sounds/notification.mp3' },
    { id: 'new_order',       label: 'New Order',            emoji: '🛎️', src: '/sounds/new_order.mp3', nativePath: 'public/sounds/new_order.mp3' },
    { id: 'order_ready',     label: 'Order Ready',          emoji: '✅', src: '/sounds/order_ready.mp3', nativePath: 'public/sounds/order_ready.mp3' },
    { id: 'attention_alert', label: 'Attention Alert',      emoji: '📣', src: '/sounds/attention_alert.mp3', nativePath: 'public/sounds/attention_alert.mp3' },
    { id: 'payment_success', label: 'Payment Success',      emoji: '💳', src: '/sounds/payment_success.mp3', nativePath: 'public/sounds/payment_success.mp3' },
    { id: 'pos_notification',label: 'POS Notification',     emoji: '🏪', src: '/sounds/pos_notification.mp3', nativePath: 'public/sounds/pos_notification.mp3' },
    { id: 'restaurant_bell', label: 'Restaurant Bell',      emoji: '🍽️', src: '/sounds/restaurant_bell.mp3', nativePath: 'public/sounds/restaurant_bell.mp3' },
    { id: 'doraemon',        label: 'Doraemon Alert',       emoji: '🐱', src: '/sounds/doraemon.mpeg', nativePath: 'public/sounds/doraemon.mpeg' },
];

/** Look up the sound config for a stored sound ID. */
export function getSoundConfig(soundId: string): NotificationSound {
    return NOTIFICATION_SOUNDS.find((s) => s.id === soundId) || NOTIFICATION_SOUNDS[0];
}

/** Preload all sounds for NativeAudio (called once on boot) */
export async function preloadNativeSounds() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        for (const sound of NOTIFICATION_SOUNDS) {
            await NativeAudio.preload({
                assetId: sound.id,
                assetPath: sound.nativePath,
                audioChannelNum: 1,
                isUrl: false
            });
        }
        console.log('✅ [NativeAudio] Sounds preloaded');
    } catch (e: any) {
        console.error('❌ [NativeAudio] Preload failed', e);
        // Dispatch event or just let the caller know it failed.
        // We can't import toast easily outside of a React component if not initialized, but we'll try.
    }
}

/** Look up the web URL for a stored sound ID. */
export function getSoundSrc(soundId: string): string {
    return getSoundConfig(soundId).src;
}

/** Preview a sound in the Settings page. Returns a stop function. */
export function previewSound(soundId: string): () => void {
    if (Capacitor.isNativePlatform()) {
        const config = getSoundConfig(soundId);
        NativeAudio.play({ assetId: config.id }).catch(e => console.error(e));
        return () => {
            NativeAudio.stop({ assetId: config.id }).catch(() => {});
        };
    }

    const src   = getSoundSrc(soundId);
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
    return () => {
        audio.pause();
        audio.currentTime = 0;
    };
}
