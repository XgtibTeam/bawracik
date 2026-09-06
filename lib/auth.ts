// PENTING: file ini dipakai baik di middleware (Edge Runtime) maupun di API route
// (Node.js Runtime). Edge Runtime TIDAK mendukung modul Node.js `crypto`, jadi di
// sini kita pakai Web Crypto API (`crypto.subtle`) yang tersedia di kedua runtime.
//
// Generalisasi dari versi lama (admin-only) supaya support 4 role:
// superadmin, admin (per-cabang), kasir/karyawan (per-cabang), member (login via WA).

import type { Role, Session } from './types';

export const SESSION_COOKIE_NAME = 'baw_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam (staff)
const MEMBER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari (member area)

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET belum diatur di .env.local');
  return secret;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bufferToHex(signature);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Payload di-encode base64url supaya field bertipe teks bebas (nama, username)
// tetap aman dipisah pakai delimiter ":" tanpa bentrok karakter.
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}
function fromBase64Url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Buat session token untuk role apapun.
 * cabangId null diperbolehkan hanya untuk role 'superadmin'.
 */
export async function createSessionToken(params: {
  role: Role;
  username: string;
  nama: string;
  cabangId: string | null;
}): Promise<string> {
  const ttl = params.role === 'member' ? MEMBER_SESSION_TTL_MS : SESSION_TTL_MS;
  const expires = Date.now() + ttl;
  const fields = [
    params.role,
    toBase64Url(params.username),
    toBase64Url(params.nama),
    params.cabangId ? toBase64Url(params.cabangId) : '-',
    String(expires),
  ];
  const payload = fields.join(':');
  const signature = await sign(payload);
  return `${payload}:${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const parts = token.split(':');
    if (parts.length !== 6) return null;
    const [role, usernameB64, namaB64, cabangB64, expiresStr, signature] = parts;

    const validRoles: Role[] = ['superadmin', 'admin', 'kasir', 'member'];
    if (!validRoles.includes(role as Role)) return null;

    const payload = [role, usernameB64, namaB64, cabangB64, expiresStr].join(':');
    const expected = await sign(payload);
    if (!timingSafeEqualStr(signature, expected)) return null;

    const expires = parseInt(expiresStr, 10);
    if (!Number.isFinite(expires) || Date.now() >= expires) return null;

    return {
      role: role as Role,
      username: fromBase64Url(usernameB64),
      nama: fromBase64Url(namaB64),
      cabangId: cabangB64 === '-' ? null : fromBase64Url(cabangB64),
      expires,
    };
  } catch {
    return null;
  }
}

/** Helper: cek apakah session boleh akses data cabang tertentu. */
export function canAccessBranch(session: Session, cabangId: string): boolean {
  if (session.role === 'superadmin') return true;
  return session.cabangId === cabangId;
}

// ---------- Password hashing (Web Crypto, Edge-compatible) ----------
// Pakai PBKDF2 lewat crypto.subtle, bukan bcryptjs (bcryptjs butuh Node.js runtime
// penuh dan tidak jalan mulus di Edge Runtime yang dipakai middleware.ts).

const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(plain), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derived);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = parseInt(iterStr, 10);
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(plain), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return timingSafeEqualStr(bufferToHex(derived), hashHex);
  } catch {
    return false;
  }
}
