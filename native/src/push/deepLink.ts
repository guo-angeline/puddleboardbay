/**
 * Pure parser for every deep-link shape the app can receive:
 *   paddletowater://spot/32
 *   paddletowater:///?spot=32&from=alert&window=Sat%207%20to%2010am&t=abc123
 *   https://paddletowater.com/spot/32?from=share
 *   https://paddletowater.com/?spot=32&from=alert&t=abc123
 * Push payload `data.url` values are site-relative ("/?spot=32&from=alert...",
 * composed by web/lib/alerts/select.ts composeAlert) and parse here too.
 */
export interface DeepLink {
  spotId: number | null;
  from: "alert" | "share" | "email" | "deeplink";
  /** Durable subscription token riding an alert/email link (open-ping id). */
  token: string | null;
  /** Human window label for the alert interstitial, when present. */
  windowLabel: string | null;
}

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of qs.replace(/^\?/, "").split("&")) {
    if (!pair) continue;
    const i = pair.indexOf("=");
    const k = i === -1 ? pair : pair.slice(0, i);
    const v = i === -1 ? "" : pair.slice(i + 1);
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function parseDeepLink(url: string): DeepLink | null {
  if (!url) return null;

  // Split off scheme + host for custom-scheme and https forms alike.
  let rest = url;
  const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\//i.exec(url);
  if (schemeMatch) {
    rest = url.slice(schemeMatch[0].length);
    const slash = rest.indexOf("/");
    if (/^https?:/i.test(url)) {
      // https://host/path?query
      rest = slash === -1 ? "" : rest.slice(slash);
    } else if (slash !== -1 && !rest.startsWith("/")) {
      // paddletowater://spot/32 -> host part IS the first path segment
      rest = `/${rest}`;
    } else if (slash === -1) {
      rest = "";
    }
  }

  const qIndex = rest.indexOf("?");
  const path = qIndex === -1 ? rest : rest.slice(0, qIndex);
  const params = qIndex === -1 ? {} : parseQuery(rest.slice(qIndex));

  let spotId: number | null = null;
  const pathMatch = /^\/+spot\/(\d+)/.exec(path);
  if (pathMatch) spotId = Number(pathMatch[1]);
  else if (params.spot && /^\d+$/.test(params.spot)) spotId = Number(params.spot);

  const from =
    params.from === "alert" || params.from === "share" || params.from === "email"
      ? params.from
      : "deeplink";

  if (spotId === null && !params.from) return null;

  return {
    spotId,
    from,
    token: params.t || null,
    windowLabel: params.window || null,
  };
}
