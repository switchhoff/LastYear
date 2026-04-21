import { NextRequest, NextResponse } from 'next/server';

const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';
const FIREBASE_PROJECT_ID = 'studio-8790021152-8f79e';
const FIREBASE_API_KEY = 'AIzaSyBbf9xNTgXefZCu3hx959L8ABPJdiXvzqI';

// Get OAuth2 access token from Cloud Run metadata server (available in Firebase App Hosting)
async function getAccessToken(): Promise<string> {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!res.ok) throw new Error('Failed to get access token from metadata server');
  const data = await res.json();
  return data.access_token;
}

async function getFcmTokenForUser(userId: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.fields?.fcmToken?.stringValue ?? null;
}

export async function POST(req: NextRequest) {
  const { title, body, senderUserId } = await req.json();

  const recipientId = senderUserId === ALEX_USER_ID ? AMALIE_USER_ID : ALEX_USER_ID;
  const recipientToken = await getFcmTokenForUser(recipientId).catch(() => null);

  if (!recipientToken) {
    return NextResponse.json({ ok: false, error: 'No FCM token for recipient' });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('[notify] Could not get access token:', err);
    return NextResponse.json({ ok: false, error: 'Auth failed' }, { status: 503 });
  }

  const fcmRes = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: recipientToken,
          notification: { title, body },
          webpush: {
            notification: {
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              click_action: '/',
            },
            fcm_options: { link: '/' },
          },
        },
      }),
    }
  );

  if (!fcmRes.ok) {
    const err = await fcmRes.text();
    console.error('[notify] FCM v1 error:', err);
  }

  return NextResponse.json({ ok: fcmRes.ok });
}
