// RFC 6238 time-based one-time codes (what Google Authenticator / Authy show), checked with WebCrypto.

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function base32Decode(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function codeAt(key: CryptoKey, counter: number): Promise<string> {
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** True when `code` matches the current 30s window or one next to it (allows for clock drift). */
export async function verifyTotp(secret: string, code: string, now = Date.now()): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
  for (const drift of [0, -1, 1]) {
    if ((await codeAt(key, counter + drift)) === code) return true;
  }
  return false;
}

/** Link an authenticator app understands when scanned as a QR code. */
export const otpauthUri = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
