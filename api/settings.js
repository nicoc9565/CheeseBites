import { isAuthorized, rejectUnauthorized, isOwnBlobUrl } from "./_lib/auth.js";
import {
  readSettings, writeSettings, readHistory, readVersion, normalize, money, cleanPhone, isEmail, RESTORABLE,
} from "./_lib/settings.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // La web pide la configuración en cada visita: la guardamos 30 segundos en la red
    // de Vercel para no gastar operaciones. El panel pide "?fresh=…" y la lee al momento.
    // (el navegador no guarda copia: siempre pregunta, y Vercel le contesta desde su copia)
    const fresh = "fresh" in (req.query || {});
    res.setHeader("Cache-Control", "no-store");
    try {
      if ("history" in (req.query || {})) {
        if (!(await isAuthorized(req))) return rejectUnauthorized(res);
        return res.status(200).json({ versions: await readHistory() });
      }
      const settings = await readSettings();
      if (!fresh) {
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Vercel-CDN-Cache-Control", "max-age=30, stale-while-revalidate=60");
      }
      return res.status(200).json(settings);
    } catch {
      return res.status(503).json({ error: "Settings unavailable" });
    }
  }

  if (req.method === "POST") {
    if (!(await isAuthorized(req))) return rejectUnauthorized(res);
    try {
      const current = await readSettings();
      const u = req.body || {};

      // Deshacer: vuelve a una versión anterior (todo menos las fotos)
      if (typeof u.restore === "string") {
        const old = await readVersion(u.restore);
        if (!old) return res.status(404).json({ error: "That version no longer exists" });
        const next = { ...current };
        for (const k of RESTORABLE) next[k] = old[k];
        return res.status(200).json(await writeSettings(next, current));
      }

      const next = { ...current };

      if ("price" in u) {
        const p = money(u.price, 1, 1000, null);
        if (p === null) return res.status(400).json({ error: "Price must be between $1 and $1000" });
        next.price = p;
      }
      for (const [field, prefix] of [["heroImage", "hero"], ["instructionsImage", "instructions"]]) {
        if (field in u) {
          if (!isOwnBlobUrl(u[field], [prefix])) return res.status(400).json({ error: "Invalid image" });
          next[field] = u[field];
        }
      }
      if ("promo" in u) next.promo = { ...current.promo, ...(u.promo || {}) };
      if ("orders" in u) next.orders = { ...current.orders, ...(u.orders || {}) };
      if ("announcement" in u) {
        next.announcement = { ...current.announcement, ...(u.announcement || {}) };
        if (next.announcement.active && !String(next.announcement.text || "").trim())
          return res.status(400).json({ error: "Write the announcement text first." });
      }
      if ("faq" in u) {
        if (!Array.isArray(u.faq)) return res.status(400).json({ error: "Invalid questions" });
        if (u.faq.some((f) => !String(f?.q || "").trim() || !String(f?.a || "").trim()))
          return res.status(400).json({ error: "Every question needs a question and an answer." });
        next.faq = u.faq;
      }
      if ("contact" in u) {
        const c = u.contact || {};
        if (!cleanPhone(c.orderPhone)) return res.status(400).json({ error: "The order phone number is not valid." });
        if (!Array.isArray(c.phones) || c.phones.some((p) => !cleanPhone(p)))
          return res.status(400).json({ error: "One of the phone numbers is not valid." });
        if (!isEmail(c.email)) return res.status(400).json({ error: "The email is not valid." });
        next.contact = c;
      }
      if ("galleryOrder" in u) {
        if (!Array.isArray(u.galleryOrder) || u.galleryOrder.some((x) => !isOwnBlobUrl(x, ["gallery"])))
          return res.status(400).json({ error: "Invalid photo order" });
        next.galleryOrder = u.galleryOrder;
      }

      const check = normalize(next);
      const wantsActive = u.promo && "active" in u.promo ? u.promo.active === true : current.promo.active;
      if (wantsActive && !check.promo.active) {
        return res.status(400).json({ error: "This promo would not give a discount. Check the numbers." });
      }
      if (u.promo?.startDate && u.promo?.endDate && u.promo.endDate < u.promo.startDate) {
        return res.status(400).json({ error: "The end date is before the start date." });
      }

      return res.status(200).json(await writeSettings(next, current));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "Failed to save settings", detail: msg });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
