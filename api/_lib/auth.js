import { createHash, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
import { put, list, del } from "@vercel/blob";
import { ENV_PREFIX, blobPath } from "./env.js";

const sha = (s) => createHash("sha256").update(String(s)).digest();
const AUTH_PREFIX = blobPath("config/auth-");

// La contraseña que cambia el dueño desde el panel se guarda como "huella"
// (scrypt con sal), nunca en texto. Si no la cambió nunca, vale ADMIN_PASSWORD de Vercel.
// Para recuperar el acceso: borrar config/auth-*.json y vuelve a valer ADMIN_PASSWORD.
let cache = { at: 0, value: undefined };

async function readStoredHash() {
  if (cache.value !== undefined && Date.now() - cache.at < 60_000) return cache.value;
  const { blobs } = await list({ prefix: AUTH_PREFIX });
  let value = null;
  if (blobs.length) {
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const r = await fetch(blobs[0].downloadUrl || blobs[0].url, { cache: "no-store" });
    if (!r.ok) throw new Error("Auth read failed");
    value = await r.json();
  }
  cache = { at: Date.now(), value };
  return value;
}

const scryptHex = (pw, salt) => scryptSync(String(pw), Buffer.from(salt, "hex"), 64).toString("hex");

// Devuelve true solo si la contraseña coincide. Si no hay contraseña configurada, nadie entra.
export async function isAuthorized(req) {
  const given = req.headers["x-admin-password"];
  if (typeof given !== "string" || given.length === 0 || given.length > 200) return false;
  let stored;
  try {
    stored = await readStoredHash();
  } catch {
    return false;
  }
  if (stored?.salt && stored?.hash) {
    return timingSafeEqual(Buffer.from(scryptHex(given, stored.salt), "hex"), Buffer.from(stored.hash, "hex"));
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha(given), sha(expected));
}

export async function setPassword(newPassword) {
  const salt = randomBytes(16).toString("hex");
  const record = { salt, hash: scryptHex(newPassword, salt), changedAt: new Date().toISOString() };
  await put(`${AUTH_PREFIX}${Date.now()}.json`, JSON.stringify(record), {
    access: "public",
    contentType: "application/json",
  });
  cache = { at: Date.now(), value: record };
  try {
    const { blobs } = await list({ prefix: AUTH_PREFIX });
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const old = blobs.slice(1).map((b) => b.url);
    if (old.length) await del(old);
  } catch {}
}

// Respuesta 401 con una demora, para que probar contraseñas a lo bruto sea lento.
export async function rejectUnauthorized(res) {
  await new Promise((r) => setTimeout(r, 1000));
  return res.status(401).json({ error: "Wrong password" });
}

// Solo aceptamos URLs de nuestro almacenamiento de Vercel Blob (y del entorno actual).
export function isOwnBlobUrl(url, prefixes) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".public.blob.vercel-storage.com")) return false;
    const path = u.pathname.replace(/^\//, "");
    return prefixes.some((p) => path.startsWith(`${ENV_PREFIX}${p}/`));
  } catch {
    return false;
  }
}
