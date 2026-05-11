const FIREBASE_PROJECT_ID = 'studio-8790021152-8f79e';
const FIREBASE_API_KEY = 'AIzaSyBbf9xNTgXefZCu3hx959L8ABPJdiXvzqI';

// OAuth2 via Cloud Run metadata server — only works in App Hosting runtime
export async function getAccessToken(): Promise<string> {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!res.ok) throw new Error(`Metadata server ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

export async function getFcmTokenForUser(userId: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.fields?.fcmToken?.stringValue ?? null;
}

export async function sendFcmPush(
  accessToken: string,
  recipientToken: string,
  title: string,
  body: string
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: recipientToken,
          notification: { title, body },
          webpush: {
            notification: {
              icon: '/lastyear.png',
              badge: '/lastyear.png',
            },
            fcm_options: { link: '/' },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    console.error('[fcm-send] FCM error:', await res.text());
  }
  return res.ok;
}
