// Web Crypto based authentication utilities (Edge & Node.js compatible)

const SESSION_COOKIE_NAME = "omnihub_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Get the master secret from environment or fallback
function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "omnihub-super-secure-master-secret-key-change-in-prod-2025"
  );
}

// Generate SHA-256 hash with salt
export async function hashPassword(password: string, customSalt?: string): Promise<string> {
  const salt = customSalt || crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + getAuthSecret());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hashHex}`;
}

// Verify password against stored hash or fallback default
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  const envPassword = process.env.ADMIN_PASSWORD;

  // 1. If ADMIN_PASSWORD env is set, it can be used directly for login
  if (envPassword && password === envPassword) {
    return true;
  }

  // 2. If stored hash exists in DB, verify with salt
  if (storedHash && storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    const testHash = await hashPassword(password, salt);
    const [, computedHash] = testHash.split(":");
    return computedHash === originalHash;
  }

  // 3. Default master password fallback for first-time local setup
  if (!envPassword && !storedHash) {
    return password === "admin888" || password === "omnihub123";
  }

  return false;
}

// Create signed Session Token using HMAC-SHA256
export async function createSessionToken(): Promise<string> {
  const payload = {
    sub: "admin",
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    nonce: crypto.randomUUID(),
  };

  const payloadB64 = btoa(JSON.stringify(payload));
  const secretKey = getAuthSecret();
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureB64 = btoa(String.fromCharCode(...signatureArray));

  return `${payloadB64}.${signatureB64}`;
}

// Verify Session Token signature and expiration
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    if (!token || !token.includes(".")) return false;
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return false;

    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || Date.now() > payload.exp) {
      return false; // Expired
    }

    const secretKey = getAuthSecret();
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const binarySig = atob(signatureB64);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(payloadB64)
    );

    return isValid;
  } catch (err) {
    return false;
  }
}

export const AUTH_CONFIG = {
  COOKIE_NAME: SESSION_COOKIE_NAME,
  MAX_AGE: SESSION_MAX_AGE,
};
