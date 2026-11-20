import { put } from "@vercel/blob";
import { isAuthorized, rejectUnauthorized } from "./_lib/auth.js";

export const config = { api: { bodyParser: false } };

// Vercel corta los pedidos de más de 4,5 MB; el panel comprime antes de subir.
const MAX_BYTES = 4 * 1024 * 1024;
const PREFIXES = ["gallery", "hero", "instructions"];
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("too large"), { code: "TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthorized(req)) return rejectUnauthorized(res);

  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim();
  const ext = TYPES[contentType];
  if (!ext) return res.status(415).json({ error: "Only JPG, PNG or WebP photos" });

  const prefix = PREFIXES.includes(req.headers["x-prefix"]) ? req.headers["x-prefix"] : "gallery";
  const base = String(req.headers["x-filename"] || "photo")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60) || "photo";

  try {
    const body = await readBody(req, MAX_BYTES);
    if (body.length === 0) return res.status(400).json({ error: "Empty file" });

    const blob = await put(`${prefix}/${Date.now()}-${base}.${ext}`, body, {
      access: "public",
      contentType,
    });
    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    if (err?.code === "TOO_LARGE") return res.status(413).json({ error: "Photo is too large (max 4 MB)" });
    return res.status(500).json({ error: "Upload failed" });
  }
}
