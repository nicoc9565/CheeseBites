import { put, list, del } from "@vercel/blob";
import { isAuthorized, rejectUnauthorized, isOwnBlobUrl } from "./_lib/auth.js";

const SETTINGS_PREFIX = "config/settings-";

const DEFAULT_PROMO = {
  active: false,
  type: "buyXpayY", // "buyXpayY" (2x1, 3x2…), "bundle" (X boxes for $Y), "percent" (% off)
  buy: 2,
  pay: 1,
  bundleQty: 2,
  bundlePrice: 25,
  percent: 10,
  label: "",
  description: "",
};

const DEFAULTS = {
  price: 15,
  heroImage: null,
  instructionsImage: null,
  promo: DEFAULT_PROMO,
};

const fresh = () => ({ ...DEFAULTS, promo: { ...DEFAULT_PROMO } });

const int = (v, min, max, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const money = (v, min, max, fallback) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Deja la promo siempre en un formato válido. Una promo que no se puede
// calcular (por ejemplo la vieja, que no tenía tipo) queda desactivada.
function normalizePromo(p, price) {
  const src = p && typeof p === "object" ? p : {};
  const promo = {
    active: src.active === true,
    type: ["buyXpayY", "bundle", "percent"].includes(src.type) ? src.type : null,
    buy: int(src.buy, 2, 20, DEFAULT_PROMO.buy),
    pay: int(src.pay, 1, 19, DEFAULT_PROMO.pay),
    bundleQty: int(src.bundleQty, 2, 20, DEFAULT_PROMO.bundleQty),
    bundlePrice: money(src.bundlePrice, 1, 10000, DEFAULT_PROMO.bundlePrice),
    percent: int(src.percent, 1, 90, DEFAULT_PROMO.percent),
    label: text(src.label, 40),
    description: text(src.description, 140),
  };
  if (promo.pay >= promo.buy) promo.pay = promo.buy - 1;

  let valid = promo.type !== null;
  if (promo.type === "bundle" && promo.bundlePrice >= promo.bundleQty * price) valid = false;
  if (!valid) {
    promo.active = false;
    promo.type = promo.type || "buyXpayY";
  }
  return promo;
}

function normalize(data) {
  const price = money(data.price, 1, 1000, DEFAULTS.price);
  return {
    price,
    heroImage: typeof data.heroImage === "string" ? data.heroImage : null,
    instructionsImage: typeof data.instructionsImage === "string" ? data.instructionsImage : null,
    promo: normalizePromo(data.promo, price),
  };
}

// Lanza error si no puede leer: así nunca se guarda la configuración de
// fábrica encima de la real por un fallo pasajero.
async function readSettings() {
  const { blobs } = await list({ prefix: SETTINGS_PREFIX });
  if (blobs.length === 0) return fresh();
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const r = await fetch(blobs[0].downloadUrl || blobs[0].url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Settings read failed (${r.status})`);
  return normalize(await r.json());
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      return res.status(200).json(await readSettings());
    } catch {
      return res.status(503).json({ error: "Settings unavailable" });
    }
  }

  if (req.method === "POST") {
    if (!isAuthorized(req)) return rejectUnauthorized(res);
    try {
      const current = await readSettings();
      const u = req.body || {};
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
      if ("promo" in u) {
        next.promo = { ...current.promo, ...(u.promo || {}) };
      }

      const saved = normalize(next);
      const wantsActive = u.promo && "active" in u.promo ? u.promo.active === true : current.promo.active;
      if (wantsActive && !saved.promo.active) {
        return res.status(400).json({
          error: "This promo would not give a discount. Check the numbers.",
        });
      }

      await put(`${SETTINGS_PREFIX}${Date.now()}.json`, JSON.stringify(saved), {
        access: "public",
        contentType: "application/json",
      });

      // Limpieza: archivos de configuración viejos y fotos principales reemplazadas
      try {
        const { blobs } = await list({ prefix: SETTINGS_PREFIX });
        blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        const old = blobs.slice(1).map((b) => b.url);
        for (const [field, prefix] of [["heroImage", "hero"], ["instructionsImage", "instructions"]]) {
          const prev = current[field];
          if (prev && prev !== saved[field] && isOwnBlobUrl(prev, [prefix])) old.push(prev);
        }
        if (old.length) await del(old);
      } catch {
        // Si la limpieza falla no pasa nada: lo importante ya se guardó
      }

      return res.status(200).json(saved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "Failed to save settings", detail: msg });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
