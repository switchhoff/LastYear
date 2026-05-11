import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getFcmTokenForUser, sendFcmPush } from '@/lib/fcm-send';

const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';

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
    console.error('[notify] Auth failed:', err);
    return NextResponse.json({ ok: false, error: 'Auth failed' }, { status: 503 });
  }

  const ok = await sendFcmPush(accessToken, recipientToken, title, body);
  return NextResponse.json({ ok });
}
