import { isAuthorized, rejectUnauthorized, setPassword } from "./_lib/auth.js";

// Cambiar la contraseña del panel. Pide la actual (en el encabezado, como siempre) y la nueva.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await isAuthorized(req))) return rejectUnauthorized(res);
  res.setHeader("Cache-Control", "no-store");

  const pw = req.body?.newPassword;
  if (typeof pw !== "string" || pw.trim() !== pw) return res.status(400).json({ error: "The password can't start or end with spaces." });
  if (pw.length < 8) return res.status(400).json({ error: "Use at least 8 characters." });
  if (pw.length > 100) return res.status(400).json({ error: "Use 100 characters or fewer." });

  try {
    await setPassword(pw);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Could not change the password. Try again." });
  }
}
