import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function storeFcmToken(userId: string, token: string) {
  const db = getFirestore(getApp());
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { fcmToken: token }).catch(() => {});
}

// Register firebase-messaging-sw.js at its own scope so it coexists with
// next-pwa's sw.js (which owns scope /). FCM push events are delivered to
// whichever SW holds the push subscription — scope doesn't need to match page.
async function getFcmSwRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistrations();
  const found = existing.find(r => r.active?.scriptURL.includes('firebase-messaging-sw.js'));
  if (found) return found;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  });
}

export async function initNotifications(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (!('serviceWorker' in navigator)) return;
  if (!VAPID_KEY) {
    console.warn('[notifications] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — push disabled.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  try {
    const swRegistration = await getFcmSwRegistration();
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (token) {
      await storeFcmToken(userId, token);
      console.log('[notifications] FCM token stored:', token.slice(0, 20) + '...');
    } else {
      console.warn('[notifications] No FCM token returned — check VAPID key and SW registration.');
    }

    // Swallow foreground messages — user sees updates in real-time
    onMessage(messaging, () => {});
  } catch (err) {
    console.error('[notifications] Init failed:', err);
  }
}

export async function sendNewMessageNotification(
  senderName: string,
  messageText: string,
  senderUserId: string
): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${senderName} 💬`,
        body: messageText.length > 80 ? messageText.slice(0, 77) + '...' : messageText,
        senderUserId,
      }),
    });
  } catch { /* non-critical */ }
}

export async function sendNewReactionNotification(
  senderName: string,
  emoji: string,
  senderUserId: string
): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${senderName} reacted ${emoji}`,
        body: 'Tap to see the memory',
        senderUserId,
      }),
    });
  } catch { /* non-critical */ }
}
