import { put, list, del } from "@vercel/blob";

const SETTINGS_PREFIX = "config/settings-";

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
    const { blobs } = await list({ prefix: SETTINGS_PREFIX });
    if (blobs.length === 0) return { ...DEFAULTS, promo: { ...DEFAULTS.promo } };
    // Sort descending by uploadedAt → always read the freshest file
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url);
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
    // No cache — settings must always be fresh so admin changes apply immediately
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
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

      // Save under a new timestamped path → fresh CDN URL, no stale cache
      const newPath = `${SETTINGS_PREFIX}${Date.now()}.json`;
      await put(newPath, JSON.stringify(newSettings), {
        access: "public",
        contentType: "application/json",
      });

      // Clean up old settings files — keep only the newest one
      const { blobs } = await list({ prefix: SETTINGS_PREFIX });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      if (blobs.length > 1) {
        await Promise.all(blobs.slice(1).map((b) => del(b.url)));
      }

      return res.status(200).json(newSettings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "Failed to save settings", detail: msg });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
