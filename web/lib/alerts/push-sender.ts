import "server-only";
import webpush from "web-push";

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SendResult {
  ok: boolean;
  statusCode: number | null;
  gone: boolean; // 404/410: subscription expired, caller should disable it
}

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:alerts@paddletowater.com", publicKey, privateKey);
  configured = true;
}

export async function sendPush(
  target: PushTarget,
  payload: { title: string; body: string; url: string }
): Promise<SendResult> {
  configure();
  try {
    const res = await webpush.sendNotification(
      { endpoint: target.endpoint, keys: target.keys },
      JSON.stringify(payload)
    );
    return { ok: true, statusCode: res.statusCode, gone: false };
  } catch (err) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : null;
    return { ok: false, statusCode, gone: statusCode === 404 || statusCode === 410 };
  }
}
