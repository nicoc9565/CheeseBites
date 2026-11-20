import { put, list, del } from "@vercel/blob";
import { blobPath } from "./env.js";
import { isOwnBlobUrl } from "./auth.js";

export const SETTINGS_PREFIX = blobPath("config/settings-");
const KEEP_VERSIONS = 10; // versiones guardadas para poder deshacer

export const DEFAULT_PROMO = {
  active: false,
  type: "buyXpayY", // "buyXpayY" (2x1, 3x2…), "bundle" (X boxes for $Y), "percent" (% off)
  buy: 2,
  pay: 1,
  bundleQty: 2,
  bundlePrice: 25,
  percent: 10,
  label: "",
  description: "",
  startDate: "", // "AAAA-MM-DD" (hora de New Jersey). Vacío = desde ya
  endDate: "", // vacío = sin fecha de fin
};

// Las preguntas que ya estaban en la web. "{price}" se reemplaza por el precio actual.
export const DEFAULT_FAQ = [
  {
    q: "What area do you deliver to?",
    a: "We currently deliver within New Jersey and surrounding areas including New York. If you're outside our usual zone, just reach out — we'll do our best to accommodate!",
  },
  {
    q: "How should I store them before baking?",
    a: "Keep them refrigerated until you're ready to bake. They stay fresh for up to 7 days in the fridge. You can also freeze them for up to 2 months — just bake straight from frozen, adding 5 extra minutes.",
  },
  {
    q: "Are they really gluten free?",
    a: "Yes! Cheese Bites are made with yuca (cassava) flour, which is 100% gluten free. However, they are prepared in a kitchen that may handle wheat products, so we recommend caution if you have a severe gluten allergy.",
  },
  {
    q: "How many come in a box and what's the price?",
    a: "Each box comes with 6 cheese bites for ${price}, tax free with free delivery. You can order multiple boxes — the more, the merrier!",
  },
  {
    q: "How long does delivery take?",
    a: "After we confirm your order, delivery is typically within 1–2 days depending on your location and our availability. We'll coordinate a convenient time directly with you via text.",
  },
  {
    q: "Can I place a bulk or custom order?",
    a: "Absolutely! We love doing large orders for events, parties, and gatherings. Just reach out via email at cheesebitesllc@gmail.com or text us directly and we'll work something out.",
  },
];

export const DEFAULT_CONTACT = {
  orderPhone: "+19083464064", // recibe los pedidos por iMessage/SMS y WhatsApp
  phones: ["+19083464064", "+19734595443"], // los que se muestran abajo de todo
  email: "cheesebitesllc@gmail.com",
};

const DEFAULTS = {
  price: 15,
  heroImage: null,
  instructionsImage: null,
  promo: DEFAULT_PROMO,
  orders: { paused: false, message: "" },
  announcement: { active: false, text: "" },
  faq: DEFAULT_FAQ,
  contact: DEFAULT_CONTACT,
  galleryOrder: [],
};

const int = (v, min, max, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
export const money = (v, min, max, fallback) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// "+1 (908) 346-4064" → "+19083464064". Devuelve null si no parece un teléfono.
export function cleanPhone(v) {
  if (typeof v !== "string") return null;
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}
export const isEmail = (v) => typeof v === "string" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) && v.length <= 100;

// Deja la promo siempre en un formato válido. Una promo que no se puede
// calcular queda desactivada.
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
    startDate: isDate(src.startDate) ? src.startDate : "",
    endDate: isDate(src.endDate) ? src.endDate : "",
  };
  if (promo.pay >= promo.buy) promo.pay = promo.buy - 1;
  if (promo.startDate && promo.endDate && promo.endDate < promo.startDate) promo.endDate = "";

  let valid = promo.type !== null;
  if (promo.type === "bundle" && promo.bundlePrice >= promo.bundleQty * price) valid = false;
  if (!valid) {
    promo.active = false;
    promo.type = promo.type || "buyXpayY";
  }
  return promo;
}

function normalizeFaq(list) {
  if (!Array.isArray(list)) return DEFAULT_FAQ;
  return list
    .map((f) => ({ q: text(f?.q, 200), a: text(f?.a, 1500) }))
    .filter((f) => f.q && f.a)
    .slice(0, 20);
}

function normalizeContact(c) {
  const src = c && typeof c === "object" ? c : {};
  const phones = Array.isArray(src.phones) ? src.phones.map(cleanPhone).filter(Boolean).slice(0, 4) : DEFAULT_CONTACT.phones;
  return {
    orderPhone: cleanPhone(src.orderPhone) || DEFAULT_CONTACT.orderPhone,
    phones,
    email: isEmail(src.email) ? src.email.trim() : DEFAULT_CONTACT.email,
  };
}

export function normalize(data = {}) {
  const price = money(data.price, 1, 1000, DEFAULTS.price);
  const orders = data.orders && typeof data.orders === "object" ? data.orders : {};
  const ann = data.announcement && typeof data.announcement === "object" ? data.announcement : {};
  const announcement = { active: ann.active === true, text: text(ann.text, 120) };
  if (!announcement.text) announcement.active = false;
  return {
    price,
    heroImage: typeof data.heroImage === "string" ? data.heroImage : null,
    instructionsImage: typeof data.instructionsImage === "string" ? data.instructionsImage : null,
    promo: normalizePromo(data.promo, price),
    orders: { paused: orders.paused === true, message: text(orders.message, 200) },
    announcement,
    faq: "faq" in data ? normalizeFaq(data.faq) : DEFAULT_FAQ,
    contact: normalizeContact("contact" in data ? data.contact : DEFAULT_CONTACT),
    galleryOrder: Array.isArray(data.galleryOrder)
      ? data.galleryOrder.filter((u) => isOwnBlobUrl(u, ["gallery"])).slice(0, 1000)
      : [],
  };
}

async function listVersions() {
  const { blobs } = await list({ prefix: SETTINGS_PREFIX });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function readBlobJson(blob) {
  const r = await fetch(blob.downloadUrl || blob.url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Settings read failed (${r.status})`);
  return r.json();
}

// Lanza error si no puede leer: así nunca se guarda la configuración de
// fábrica encima de la real por un fallo pasajero.
export async function readSettings() {
  const blobs = await listVersions();
  if (blobs.length === 0) return normalize({});
  return normalize(await readBlobJson(blobs[0]));
}

// Guarda una versión nueva. Se quedan las últimas 10 para poder deshacer.
// Las fotos principales reemplazadas se borran (deshacer no toca las fotos).
export async function writeSettings(next, previous) {
  const saved = normalize(next);
  await put(`${SETTINGS_PREFIX}${Date.now()}.json`, JSON.stringify(saved), {
    access: "public",
    contentType: "application/json",
  });
  try {
    const blobs = await listVersions();
    const old = blobs.slice(KEEP_VERSIONS).map((b) => b.url);
    for (const [field, prefix] of [["heroImage", "hero"], ["instructionsImage", "instructions"]]) {
      const prev = previous?.[field];
      if (prev && prev !== saved[field] && isOwnBlobUrl(prev, [prefix])) old.push(prev);
    }
    if (old.length) await del(old);
  } catch {
    // Si la limpieza falla no pasa nada: lo importante ya se guardó
  }
  return saved;
}

// Versiones anteriores, de la más nueva a la más vieja (la primera es la actual)
export async function readHistory() {
  const blobs = await listVersions();
  const out = [];
  for (const b of blobs.slice(0, KEEP_VERSIONS)) {
    try {
      out.push({ id: b.pathname, savedAt: b.uploadedAt, settings: normalize(await readBlobJson(b)) });
    } catch {}
  }
  return out;
}

// Lo que se recupera al deshacer: todo menos las fotos
export const RESTORABLE = ["price", "promo", "orders", "announcement", "faq", "contact"];

export async function readVersion(pathname) {
  const blobs = await listVersions();
  const b = blobs.find((x) => x.pathname === pathname);
  if (!b) return null;
  return normalize(await readBlobJson(b));
}
