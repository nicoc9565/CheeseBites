// Cálculo de precios y promociones. Lo usan la web (js/app.js) y el panel (admin.html),
// así los dos muestran exactamente el mismo total.
(function (root) {
  const round2 = (n) => Math.round(n * 100) / 100;

  // $15 → "15" · $15.5 → "15.50"
  const fmt = (n) => {
    const r = round2(n);
    return Number.isInteger(r) ? String(r) : r.toFixed(2);
  };

  // Fecha de hoy en New Jersey, "AAAA-MM-DD" (las fechas de la promo se cuentan en esa hora)
  const todayNJ = (now = new Date()) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

  // "off" (apagada) · "scheduled" (empieza más adelante) · "live" (andando) · "ended" (ya terminó)
  const promoState = (promo, today = todayNJ()) => {
    if (!promo || !promo.active) return "off";
    if (promo.startDate && today < promo.startDate) return "scheduled";
    if (promo.endDate && today > promo.endDate) return "ended";
    return "live";
  };

  const isUsable = (promo, price, today) => {
    if (promoState(promo, today) !== "live") return false;
    if (promo.type === "buyXpayY") return promo.buy >= 2 && promo.pay >= 1 && promo.pay < promo.buy;
    if (promo.type === "bundle") return promo.bundleQty >= 2 && promo.bundlePrice > 0 && promo.bundlePrice < promo.bundleQty * price;
    if (promo.type === "percent") return promo.percent >= 1 && promo.percent <= 90;
    return false;
  };

  // Título corto de la promo si el dueño no escribió uno
  const autoLabel = (p) => {
    if (p.type === "buyXpayY") return `${p.buy}x${p.pay} Deal`;
    if (p.type === "bundle") return `${p.bundleQty} for $${fmt(p.bundlePrice)}`;
    if (p.type === "percent") return `${p.percent}% OFF`;
    return "";
  };

  const autoDescription = (p) => {
    if (p.type === "buyXpayY")
      return `Buy ${p.buy} boxes, pay for ${p.pay}. Applied automatically to your total.`;
    if (p.type === "bundle")
      return `Get ${p.bundleQty} boxes for $${fmt(p.bundlePrice)}. Applied automatically to your total.`;
    if (p.type === "percent") return `${p.percent}% off your whole order. Applied automatically.`;
    return "";
  };

  // Devuelve { subtotal, total, savings, applied, hint }
  //   hint: frase para animar a sumar cajas (ej. "Add 1 more box to get the 2x1 deal!")
  const calc = (qty, price, promo) => {
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    const subtotal = round2(q * price);
    let total = subtotal;
    let hint = "";

    if (isUsable(promo, price)) {
      const label = promo.label || autoLabel(promo);
      if (promo.type === "buyXpayY") {
        const groups = Math.floor(q / promo.buy);
        total = round2((groups * promo.pay + (q % promo.buy)) * price);
        const missing = promo.buy - (q % promo.buy);
        if (missing > 0 && missing < promo.buy)
          hint = `Add ${missing} more box${missing > 1 ? "es" : ""} to get the ${label}!`;
      } else if (promo.type === "bundle") {
        const groups = Math.floor(q / promo.bundleQty);
        total = round2(groups * promo.bundlePrice + (q % promo.bundleQty) * price);
        const missing = promo.bundleQty - (q % promo.bundleQty);
        if (missing > 0 && missing < promo.bundleQty)
          hint = `Add ${missing} more box${missing > 1 ? "es" : ""} to get the ${label} deal!`;
      } else if (promo.type === "percent") {
        total = round2(subtotal * (1 - promo.percent / 100));
      }
    }

    const savings = round2(subtotal - total);
    return { subtotal, total, savings, applied: savings > 0, hint };
  };

  root.CBPromo = { calc, fmt, isUsable, autoLabel, autoDescription, promoState, todayNJ };
})(window);
