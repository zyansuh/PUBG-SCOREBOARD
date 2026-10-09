export const SESSION_COOKIE = "opsn_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSessionToken(password: string, now = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_TTL_MS;
  const payload = `v1.${expiresAt}`;
  const signature = await hmacHex(password, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  password: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAtText, signature] = parts;
  if (version !== "v1" || !/^\d+$/.test(expiresAtText)) return false;
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || now > expiresAt) return false;
  const expected = await hmacHex(password, `${version}.${expiresAtText}`);
  return safeEqual(expected, signature);
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
