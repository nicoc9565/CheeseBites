import { put, list } from "@vercel/blob";

const SETTINGS_PATH = "config/settings.json";

const DEFAULTS = {
  price: 15,
  heroImage: null,
  instructionsImage: null,
  promo: {
    active: false,
    label: "Weekend Special!",
    specialPrice: 25,
    description: "2 boxes for $25",
  },
};

async function getSettings() {
  try {
    const { blobs } = await list({ prefix: "config/settings" });
    if (blobs.length === 0) return { ...DEFAULTS, promo: { ...DEFAULTS.promo } };
    const res = await fetch(blobs[0].url + `?t=${Date.now()}`);
    const data = await res.json();
    return {
      ...DEFAULTS,
      ...data,
      promo: { ...DEFAULTS.promo, ...(data.promo || {}) },
    };
  } catch {
    return { ...DEFAULTS, promo: { ...DEFAULTS.promo } };
  }
}

function checkAuth(req) {
  return req.headers["x-admin-password"] === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    const settings = await getSettings();
    return res.status(200).json(settings);
  }

  if (req.method === "POST") {
    if (!checkAuth(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const current = await getSettings();
      const updates = req.body || {};
      const newSettings = {
        ...current,
        ...updates,
        promo: { ...current.promo, ...(updates.promo || {}) },
      };
      await put(SETTINGS_PATH, JSON.stringify(newSettings), {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
      });
      return res.status(200).json(newSettings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "Failed to save settings", detail: msg });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
