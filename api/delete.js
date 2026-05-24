import { del } from "@vercel/blob";

function checkAuth(req) {
  const password = req.headers["x-admin-password"];
  return password === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "Missing url" });
  }

  try {
    await del(url);
    return res.status(200).json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: "Delete failed" });
  }
}
