import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s) => createHash("sha256").update(String(s)).digest();

// Devuelve true solo si la contraseña coincide. Si ADMIN_PASSWORD no está
// configurada en Vercel, nadie entra (antes, sin la variable, entraba cualquiera).
export function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  const given = req.headers["x-admin-password"];
  if (!expected || typeof given !== "string" || given.length === 0) return false;
  return timingSafeEqual(sha(given), sha(expected));
}

// Respuesta 401 con una demora, para que probar contraseñas a lo bruto sea lento.
export async function rejectUnauthorized(res) {
  await new Promise((r) => setTimeout(r, 1000));
  return res.status(401).json({ error: "Wrong password" });
}

// Solo aceptamos URLs de nuestro almacenamiento de Vercel Blob.
export function isOwnBlobUrl(url, prefixes) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".public.blob.vercel-storage.com")) return false;
    const path = u.pathname.replace(/^\//, "");
    return prefixes.some((p) => path.startsWith(`${p}/`));
  } catch {
    return false;
  }
}
