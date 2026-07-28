const encoder = new TextEncoder();

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(
  algorithm: "SHA-1" | "SHA-256",
  secret: string,
  content: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(content)),
  );
}

export async function verifyMetaSignature(
  body: string,
  signature: string | null,
  appSecret: string,
) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const digest = await hmac("SHA-256", appSecret, body);
  const expected = Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeEqual(expected, signature.slice(7));
}

export async function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
) {
  if (!authToken || !signature) return false;
  const canonical = Object.keys(params)
    .sort()
    .reduce((value, key) => value + key + params[key], url);
  const digest = await hmac("SHA-1", authToken, canonical);
  const expected = btoa(String.fromCharCode(...digest));
  return constantTimeEqual(expected, signature);
}

export function secureTokenEqual(left: string, right: string) {
  return constantTimeEqual(left, right);
}
