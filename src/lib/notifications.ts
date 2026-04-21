import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getFirestore, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Store FCM token in Firestore for this user
async function storeFcmToken(userId: string, token: string) {
  const db = getFirestore(getApp());
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { fcmToken: token }).catch(() => {
    // User doc might not exist yet, ignore
  });
}

// Request permission and get FCM token
export async function initNotifications(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (!VAPID_KEY) {
    console.warn('[notifications] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set. Push notifications disabled.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  try {
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await storeFcmToken(userId, token);
    }

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'Last Year';
      const body = payload.notification?.body || '';
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
        });
      }
    });
  } catch (err) {
    console.error('[notifications] Failed to get FCM token:', err);
  }
}

// Get the FCM token for a given user from Firestore
async function getTokenForUser(userId: string): Promise<string | null> {
  const db = getFirestore(getApp());
  const snap = await getDoc(doc(db, 'users', userId)).catch(() => null);
  return snap?.data()?.fcmToken ?? null;
}

// Notify the other user (not sender) about a new message
export async function sendNewMessageNotification(
  senderName: string,
  messageText: string,
  senderUserId: string
): Promise<void> {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${senderName} sent a message`,
        body: messageText.length > 80 ? messageText.slice(0, 77) + '...' : messageText,
        senderUserId,
      }),
    });
    if (!response.ok) console.warn('[notifications] Failed to send message notification');
  } catch (err) {
    // Non-critical — don't surface errors
  }
}

// Notify the other user about a new emoji reaction
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
        title: `${senderName} reacted`,
        body: `${senderName} reacted with ${emoji}`,
        senderUserId,
      }),
    });
  } catch (err) {
    // Non-critical
  }
}
