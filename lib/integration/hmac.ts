import "server-only";
import { createHmac } from "node:crypto";

/**
 * Calcola HMAC-SHA256 di un payload con shared secret.
 */
export function computeHmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifica:
 * - timestamp entro 5 minuti (no replay)
 * - signature HMAC valida
 * - idempotency-key presente
 */
export interface VerifyResult {
  ok: boolean;
  error?: string;
}

export function verifyErpRequest(opts: {
  timestamp: string | null;
  signature: string | null;
  idempotencyKey: string | null;
  body: string;
  secret: string | undefined;
}): VerifyResult {
  if (!opts.secret) return { ok: false, error: "QUALITY_INTEGRATION_SECRET non configurato" };
  if (!opts.timestamp) return { ok: false, error: "X-Timestamp header mancante" };
  if (!opts.signature) return { ok: false, error: "X-Signature header mancante" };
  if (!opts.idempotencyKey) return { ok: false, error: "X-Idempotency-Key header mancante" };

  const tsNum = parseInt(opts.timestamp, 10);
  if (isNaN(tsNum)) return { ok: false, error: "Timestamp non numerico" };
  const ageSec = Math.abs(Date.now() / 1000 - tsNum);
  if (ageSec > 300) return { ok: false, error: "Timestamp troppo vecchio (>5 min)" };

  const payloadToSign = `${opts.timestamp}.${opts.body}`;
  const expected = computeHmac(payloadToSign, opts.secret);
  // Time-safe compare
  if (expected.length !== opts.signature.length) return { ok: false, error: "Signature mismatch (length)" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ opts.signature.charCodeAt(i);
  if (diff !== 0) return { ok: false, error: "Signature mismatch" };

  return { ok: true };
}
