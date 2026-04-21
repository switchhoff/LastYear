import { NextRequest, NextResponse } from 'next/server';

const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
const FIREBASE_PROJECT_ID = 'studio-8790021152-8f79e';
const FIREBASE_API_KEY = 'AIzaSyBbf9xNTgXefZCu3hx959L8ABPJdiXvzqI';

async function getFcmTokenForUser(userId: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.fields?.fcmToken?.stringValue ?? null;
}

export async function POST(req: NextRequest) {
  if (!FCM_SERVER_KEY) {
    return NextResponse.json({ ok: false, error: 'FCM_SERVER_KEY not configured' }, { status: 503 });
  }

  const { title, body, senderUserId } = await req.json();

  const recipientId = senderUserId === ALEX_USER_ID ? AMALIE_USER_ID : ALEX_USER_ID;
  const recipientToken = await getFcmTokenForUser(recipientId).catch(() => null);

  if (!recipientToken) {
    return NextResponse.json({ ok: false, error: 'No token for recipient' });
  }

  const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipientToken,
      notification: {
        title,
        body,
        icon: '/icon-192x192.png',
        click_action: '/',
      },
      data: { url: '/' },
    }),
  });

  return NextResponse.json({ ok: fcmRes.ok });
}
