import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getFcmTokenForUser, sendFcmPush } from '@/lib/fcm-send';

const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Verify request is from Cloud Scheduler (or curl with secret during testing)
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const title = 'Good morning ☀️';
  const body = 'See what happened one year ago today...';

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('[notify-morning] Auth failed:', err);
    return NextResponse.json({ ok: false, error: 'Auth failed' }, { status: 503 });
  }

  const [alexToken, amalieToken] = await Promise.all([
    getFcmTokenForUser(ALEX_USER_ID).catch(() => null),
    getFcmTokenForUser(AMALIE_USER_ID).catch(() => null),
  ]);

  const results = await Promise.all([
    alexToken ? sendFcmPush(accessToken, alexToken, title, body) : Promise.resolve(false),
    amalieToken ? sendFcmPush(accessToken, amalieToken, title, body) : Promise.resolve(false),
  ]);

  console.log(`[notify-morning] alex=${results[0]} amalie=${results[1]}`);
  return NextResponse.json({ ok: true, alex: results[0], amalie: results[1] });
}
