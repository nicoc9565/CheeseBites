import { del } from "@vercel/blob";
import { isAuthorized, rejectUnauthorized, isOwnBlobUrl } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthorized(req)) return rejectUnauthorized(res);

  const { url } = req.body || {};
  // Desde el panel solo se borran fotos de la galería, nunca la configuración.
  if (!url || !isOwnBlobUrl(url, ["gallery"])) {
    return res.status(400).json({ error: "Invalid photo" });
  }

  try {
    await del(url);
    return res.status(200).json({ deleted: true });
  } catch {
    return res.status(500).json({ error: "Delete failed" });
  }
}
