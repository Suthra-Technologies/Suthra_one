/**
 * Notification sound catalogue — backed by the real MP3 files in
 * src/assets/sounds/. Admin selects a sound in Settings; the choice is
 * stored in localStorage('notificationSoundId') and read by
 * NotificationProvider on every alert.
 */

// Import every sound so Vite hashes and bundles them correctly
import snd_notification    from '../assets/sounds/notification.mp3';
import snd_new_order       from '../assets/sounds/new_order.mp3';
import snd_order_ready     from '../assets/sounds/order_ready.mp3';
import snd_attention_alert from '../assets/sounds/attention_alert.mp3';
import snd_payment_success from '../assets/sounds/payment_success.mp3';
import snd_pos_notif       from '../assets/sounds/pos_notification.mp3';
import snd_restaurant_bell from '../assets/sounds/restaurant_bell.mp3';
import snd_doraemon        from '../assets/sounds/doraemon.mpeg';

export interface NotificationSound {
    id: string;
    label: string;
    emoji: string;
    src: string; // resolved URL (Vite handles hashing)
}

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
    { id: 'notification',    label: 'Default Notification', emoji: '🔔', src: snd_notification    },
    { id: 'new_order',       label: 'New Order',            emoji: '🛎️', src: snd_new_order       },
    { id: 'order_ready',     label: 'Order Ready',          emoji: '✅', src: snd_order_ready     },
    { id: 'attention_alert', label: 'Attention Alert',      emoji: '📣', src: snd_attention_alert },
    { id: 'payment_success', label: 'Payment Success',      emoji: '💳', src: snd_payment_success },
    { id: 'pos_notification',label: 'POS Notification',     emoji: '🏪', src: snd_pos_notif       },
    { id: 'restaurant_bell', label: 'Restaurant Bell',      emoji: '🍽️', src: snd_restaurant_bell },
    { id: 'doraemon',        label: 'Doraemon Alert',       emoji: '🐱', src: snd_doraemon        },
];

/** Look up the Vite-resolved URL for a stored sound ID. */
export function getSoundSrc(soundId: string): string {
    return (
        NOTIFICATION_SOUNDS.find((s) => s.id === soundId)?.src ??
        snd_notification // safe default
    );
}

/** Preview a sound in the Settings page. Returns a stop function. */
export function previewSound(soundId: string): () => void {
    const src   = getSoundSrc(soundId);
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
    return () => {
        audio.pause();
        audio.currentTime = 0;
    };
}
