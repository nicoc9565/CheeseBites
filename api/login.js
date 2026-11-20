import { isAuthorized, rejectUnauthorized } from "./_lib/auth.js";

// El panel usa este endpoint para verificar la contraseña de verdad.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await isAuthorized(req))) return rejectUnauthorized(res);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
