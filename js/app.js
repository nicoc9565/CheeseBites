(() => {
  document.body.classList.remove("no-js");

  let UNIT_PRICE = 15;
  let PROMO = null;
  const { calc, fmt, isUsable, autoLabel, autoDescription } = window.CBPromo;
  // Contacto: vienen de la web y se reemplazan por lo que el dueño guarde en el panel
  let SMS_NUMBER = "+19083464064";
  let WA_NUMBER = "19083464064";
  let ORDER_EMAIL = "cheesebitesllc@gmail.com";

  const $ = (id) => document.getElementById(id);
  const show = (el, on) => { if (el) el.hidden = !on; };
  const isAndroid = /Android/i.test(navigator.userAgent);
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const qtyEl = $("qtyInput");
  const orderForm = $("orderForm");
  const submitBtn = $("btnWhatsApp");
  const smsBtn = $("btnSMS");
  const emailBtn = $("btnEmail");
  const igBanner = $("igBanner");
  const header = $("mainHeader");
  const orderConfirmation = $("orderConfirmation");

  if ($("year")) $("year").textContent = new Date().getFullYear();

  // Anota que alguien tocó "enviar pedido" (para las estadísticas del panel)
  const trackOrder = (channel, data) => {
    try {
      const qty = clampQty(data.get("quantity"));
      const r = calc(qty, UNIT_PRICE, PROMO);
      const payload = JSON.stringify({ channel, qty, total: r.total, promo: r.applied });
      if (!navigator.sendBeacon?.("/api/track", payload)) {
        fetch("/api/track", { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    } catch {}
  };

  // === BARRA DE ARRIBA: se vuelve translúcida al bajar ===
  const onScroll = () => header?.classList.toggle("solid", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // === NAVEGADOR DE INSTAGRAM ===
  // Ahí no anda iMessage: se esconde ese botón, WhatsApp pasa a ser el principal y aparece el mail
  const placeHeader = () => {
    if (header) header.style.top = igBanner && !igBanner.hidden ? igBanner.offsetHeight + "px" : "0";
  };
  if (/Instagram/.test(navigator.userAgent) && igBanner) {
    igBanner.hidden = false;
    show(smsBtn, false);
    submitBtn?.classList.replace("btn-white", "btn-wa");
    show(emailBtn, true);
    placeHeader();
  }
  $("igBannerClose")?.addEventListener("click", () => {
    igBanner.hidden = true;
    placeHeader();
  });

  // === CANTIDAD DE CAJAS ===
  const clampQty = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  };

  // Una bolita por chipa, con un espacio entre caja y caja (hasta 10 cajas dibujadas)
  const drawBalls = (q) => {
    const box = $("balls");
    if (!box) return;
    const boxes = Math.min(q, 10);
    const balls = [];
    for (let b = 0; b < boxes; b++) {
      if (b) { const gap = document.createElement("i"); gap.className = "gap"; balls.push(gap); }
      for (let k = 0; k < 6; k++) {
        const i = document.createElement("i");
        i.style.animationDelay = k * 30 + "ms";
        balls.push(i);
      }
    }
    box.replaceChildren(...balls);
  };

  const refreshTotal = () => {
    if (!qtyEl) return;
    const q = clampQty(qtyEl.value || 1);
    qtyEl.value = String(q);
    if ($("qtyShow")) $("qtyShow").textContent = q;
    if ($("units")) $("units").textContent = `${q * 6} cheese bites`;
    drawBalls(q);
    const r = calc(q, UNIT_PRICE, PROMO);
    if ($("priceTotal")) $("priceTotal").textContent = fmt(r.total);
    // Con promo aplicada: precio tachado + "You save $X"
    show($("priceOriginal"), r.applied);
    if ($("priceOriginalValue")) $("priceOriginalValue").textContent = fmt(r.subtotal);
    show($("promoSavings"), r.applied);
    if ($("promoSavings")) $("promoSavings").textContent = `You save $${fmt(r.savings)}`;
    // Sin promo aplicada todavía: "Add 1 more box to get the 2x1 Deal!"
    show($("promoHint"), !!r.hint);
    if ($("promoHint")) $("promoHint").textContent = r.hint;
  };
  document.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      qtyEl.value = String(clampQty(clampQty(qtyEl.value) + Number(b.dataset.step)));
      refreshTotal();
    }),
  );
  refreshTotal();

  // === VALIDACIÓN DEL FORMULARIO ===
  const VALIDATORS = {
    fieldName: { check: (v) => v.trim().length >= 2, msg: "Please enter your full name" },
    fieldPhone: { check: (v) => /^\+?[\d\s\-().]{7,}$/.test(v.trim()), msg: "Please enter a valid phone number" },
    fieldEmail: { check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), msg: "Please enter a valid email address" },
    fieldAddress: { check: (v) => v.trim().length >= 5, msg: "Please enter your delivery address" },
  };
  const getGroup = (el) => el.closest(".field-group");
  const validateField = (el) => {
    const rule = VALIDATORS[el.id];
    if (!rule) return true;
    const valid = rule.check(el.value);
    getGroup(el)?.classList.toggle("is-error", !valid);
    const errEl = $(el.id + "Error");
    if (errEl) errEl.textContent = valid ? "" : rule.msg;
    return valid;
  };
  const validateAll = () =>
    Object.keys(VALIDATORS).map((id) => ($(id) ? validateField($(id)) : true)).every(Boolean);
  Object.keys(VALIDATORS).forEach((id) => {
    const el = $(id);
    el?.addEventListener("blur", () => validateField(el));
    el?.addEventListener("input", () => {
      if (getGroup(el)?.classList.contains("is-error")) validateField(el);
    });
  });
  const focusFirstError = () => document.querySelector(".field-group.is-error input")?.focus();

  // === CONFIRMACIÓN ===
  const CONFIRM_MSGS = {
    sms: "Your Messages app should have opened — just hit <strong>Send</strong> to complete your order. We'll confirm your delivery shortly!",
    whatsapp: "WhatsApp should have opened with your order — just hit <strong>Send</strong> and we'll confirm your delivery shortly!",
    email: "Your mail app should have opened with your order — just hit <strong>Send</strong> and we'll confirm your delivery shortly!",
  };
  const showConfirmation = (channel) => {
    if (!orderConfirmation) return;
    $("orderConfirmMsg").innerHTML = CONFIRM_MSGS[channel] || CONFIRM_MSGS.sms;
    orderConfirmation.hidden = false;
    $("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("btnNewOrder")?.addEventListener("click", () => {
    orderConfirmation.hidden = true;
    orderForm?.reset();
    qtyEl.value = "1";
    refreshTotal();
    Object.keys(VALIDATORS).forEach((id) => {
      $(id) && getGroup($(id))?.classList.remove("is-error");
      if ($(id + "Error")) $(id + "Error").textContent = "";
    });
    $("order")?.scrollIntoView({ behavior: "smooth" });
  });

  // === MENSAJE DEL PEDIDO ===
  const buildMessage = (data) => {
    const qty = clampQty(data.get("quantity"));
    const r = calc(qty, UNIT_PRICE, PROMO);
    const orderLine = r.applied
      ? `Order: ${qty} box${qty > 1 ? "es" : ""}\n` +
        `Promo: ${PROMO.label || autoLabel(PROMO)} (-$${fmt(r.savings)})\n` +
        `Total: $${fmt(r.total)}\n`
      : `Order: ${qty} box${qty > 1 ? "es" : ""} ($${fmt(r.total)})\n`;
    return (
      `🧀 NEW CHEESE BITES ORDER 🧀\n\n` +
      `Name: ${data.get("name")}\n` +
      `Phone: ${data.get("phone")}\n` +
      `Email: ${data.get("email")}\n` +
      `Address: ${data.get("address")}\n\n` +
      orderLine +
      `Notes: ${data.get("notes") || "No notes"}`
    );
  };

  // Valida, cambia el texto del botón mientras abre la app y después muestra la confirmación
  const send = (btn, channel, busyText, open) => {
    if (!validateAll()) return focusFirstError();
    refreshTotal();
    const label = btn.querySelector("span");
    const original = label.textContent;
    btn.disabled = true;
    label.textContent = busyText;
    const data = new FormData(orderForm);
    trackOrder(channel, data);
    open(buildMessage(data));
    setTimeout(() => {
      btn.disabled = false;
      label.textContent = original;
      showConfirmation(channel);
    }, 1200);
  };

  // iMessage / SMS (principal). iPhone usa "&body=" y Android "?body="
  smsBtn?.addEventListener("click", () =>
    send(smsBtn, "sms", "Opening Messages...", (msg) => {
      window.location.href = `sms:${SMS_NUMBER}${isAndroid ? "?" : "&"}body=${encodeURIComponent(msg)}`;
    }),
  );

  // WhatsApp (es el "submit" del formulario, así Enter también lo usa)
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    send(submitBtn, "whatsapp", "Opening WhatsApp...", (msg) => {
      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  });

  // Mail (solo en el navegador de Instagram)
  emailBtn?.addEventListener("click", () =>
    send(emailBtn, "email", "Opening Mail…", (msg) => {
      const subject = encodeURIComponent("🧀 New Cheese Bites Order");
      window.open(`mailto:${ORDER_EMAIL}?subject=${subject}&body=${encodeURIComponent(msg)}`, "_self");
    }),
  );

  // === HORNO / AIR FRYER ===
  document.querySelectorAll(".mode").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".mode").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("fT").textContent = b.dataset.t;
      $("fM").textContent = b.dataset.m;
      $("fN").textContent = b.dataset.n;
    }),
  );

  // === PREGUNTAS: una abierta a la vez ===
  const faqList = $("faqList");
  faqList?.addEventListener(
    "toggle",
    (e) => {
      if (!e.target.open) return;
      faqList.querySelectorAll("details[open]").forEach((d) => { if (d !== e.target) d.open = false; });
    },
    true,
  );

  // === ENTRADAS AL HACER SCROLL ===
  const reveals = document.querySelectorAll(".rv");
  if (!prefersReduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const sib = [...en.target.parentElement.children].filter((x) => x.classList.contains("rv"));
          en.target.style.transitionDelay = Math.max(0, sib.indexOf(en.target)) * 80 + "ms";
          en.target.classList.add("in");
          io.unobserve(en.target);
        }),
      { threshold: 0.12 },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // === GALERÍA: las fotos se pasan solas; tocar la foto o un circulito cambia ===
  const frame = $("frame");
  const thumbs = $("thumbs");
  let photos = [];
  let cur = 0;
  let timer;
  const showPhoto = (i, user) => {
    const ims = frame.querySelectorAll("img");
    if (!ims.length) return;
    ims[cur]?.classList.remove("on");
    thumbs.children[cur]?.removeAttribute("aria-current");
    cur = i;
    ims[cur].classList.add("on");
    thumbs.children[cur]?.setAttribute("aria-current", "true");
    if (user) restart();
  };
  const restart = () => {
    clearInterval(timer);
    if (!prefersReduced && photos.length > 1) timer = setInterval(() => showPhoto((cur + 1) % photos.length), 4200);
  };
  const renderGallery = (list) => {
    if (!frame || !thumbs || !list.length) return;
    clearInterval(timer);
    photos = list;
    cur = 0;
    frame.replaceChildren();
    thumbs.replaceChildren();
    photos.forEach((src, i) => {
      const im = new Image();
      im.src = src;
      im.alt = "Cheese Bites";
      im.decoding = "async";
      if (i) im.loading = "lazy";
      frame.append(im);
      const t = document.createElement("button");
      t.type = "button";
      t.setAttribute("aria-label", `Show photo ${i + 1}`);
      const ti = new Image();
      ti.src = src;
      ti.alt = "";
      ti.loading = "lazy";
      t.append(ti);
      t.addEventListener("click", () => showPhoto(i, true));
      thumbs.append(t);
    });
    showPhoto(0);
    restart();
  };
  frame?.parentElement.addEventListener("click", () => photos.length && showPhoto((cur + 1) % photos.length, true));
  document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : restart()));
  renderGallery(["./img/IMG_6309.webp", "./img/IMG_6312.webp"]);
  fetch("/api/gallery")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const urls = (data?.images || []).map((img) => img.url).filter(Boolean);
      if (urls.length) renderGallery(urls);
    })
    .catch(() => {});

  // === CONFIGURACIÓN DEL PANEL (precio, promo, fotos, preguntas, contacto) ===
  const revealPrices = () =>
    document.querySelectorAll(".js-price-loading").forEach((el) => el.classList.remove("js-price-loading"));

  // Foto del panel si hay; si no (o si falla), la que viene con la web
  const setImage = (id, url) => {
    const img = $(id);
    if (!img) return;
    const fallback = img.dataset.fallback;
    if (fallback) img.onerror = () => { img.onerror = null; img.src = fallback; };
    img.src = url || fallback;
  };

  // "(908) 346-4064" a partir de "+19083464064"
  const prettyPhone = (p) => {
    const d = String(p).replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return String(p);
  };

  // Texto de las respuestas: "{price}" → precio actual y los mails como link
  const faqAnswerText = (a) => String(a).replace(/\{price\}/g, fmt(UNIT_PRICE));
  const fillAnswer = (p, text) => {
    p.replaceChildren();
    text.split(/([^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,})/i).forEach((part, i) => {
      if (i % 2 === 1) {
        const link = document.createElement("a");
        link.href = `mailto:${part}`;
        link.textContent = part;
        p.append(link);
      } else if (part) {
        p.append(document.createTextNode(part));
      }
    });
  };

  const renderFaq = (faq) => {
    const template = faqList?.querySelector("details");
    if (!faqList || !template || !Array.isArray(faq) || faq.length === 0) return;
    const items = faq.map(({ q, a }, i) => {
      const item = template.cloneNode(true);
      item.open = i === 0;
      item.querySelector("summary span").textContent = q;
      fillAnswer(item.querySelector("p"), faqAnswerText(a));
      return item;
    });
    faqList.replaceChildren(...items);
  };

  // Mantiene lo que lee Google (precio y preguntas) igual a lo que se ve en la web
  const updateSeo = (price, faq) => {
    const p = fmt(price);
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        const data = JSON.parse(ld.textContent);
        for (const node of data["@graph"] || []) {
          if (node["@type"] === "Product" && node.offers) node.offers.price = Number(price).toFixed(2);
          if (node["@type"] === "FAQPage") {
            if (Array.isArray(faq) && faq.length) {
              node.mainEntity = faq.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: faqAnswerText(a) },
              }));
            } else {
              for (const q of node.mainEntity || []) {
                q.acceptedAnswer.text = q.acceptedAnswer.text.replace(/\$\d+(\.\d+)?/, `$${p}`);
              }
            }
          }
        }
        ld.textContent = JSON.stringify(data);
      } catch {}
    }
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = desc.content.replace(/\$\d+(\.\d+)?/, `$${p}`);
  };

  const applyContact = (c) => {
    if (!c) return;
    if (c.orderPhone) {
      SMS_NUMBER = c.orderPhone;
      WA_NUMBER = c.orderPhone.replace(/\D/g, "");
      const faqPhone = $("faqPhone");
      if (faqPhone) {
        faqPhone.href = `tel:${c.orderPhone}`;
        faqPhone.textContent = prettyPhone(c.orderPhone);
      }
    }
    if (c.email) {
      ORDER_EMAIL = c.email;
      for (const id of ["orderEmailLink", "footerEmailLink"]) if ($(id)) $(id).href = `mailto:${c.email}`;
      if ($("orderEmailLink")) $("orderEmailLink").textContent = c.email;
      if ($("footerEmailText")) $("footerEmailText").textContent = c.email;
    }
    const box = $("footerPhones");
    const tpl = box?.querySelector("a");
    if (box && tpl && Array.isArray(c.phones) && c.phones.length) {
      const nodes = [];
      c.phones.forEach((ph, i) => {
        if (i) nodes.push(document.createElement("br"));
        const a = tpl.cloneNode(true);
        a.href = `tel:${ph}`;
        a.textContent = prettyPhone(ph);
        nodes.push(a);
      });
      box.replaceChildren(...nodes);
    }
  };

  // Pedidos pausados: se oculta el formulario y se muestra el mensaje del dueño
  const applyOrdersPaused = (orders) => {
    const paused = !!orders?.paused;
    show($("ordersPaused"), paused);
    show($("orderCoupon"), !paused);
    if ($("ordersPausedMsg")) {
      $("ordersPausedMsg").textContent =
        orders?.message || "We're not taking orders right now. Follow us on Instagram to know when we're back!";
    }
  };

  const applyAnnouncement = (ann) => {
    const on = !!(ann?.active && ann.text);
    show($("announceBar"), on);
    if (on) $("announceText").textContent = ann.text;
  };

  const applySettings = (s) => {
    if (s && s.price > 0) {
      UNIT_PRICE = Number(s.price);
      document.querySelectorAll(".js-price").forEach((el) => { el.textContent = fmt(UNIT_PRICE); });
    }
    if (s) {
      renderFaq(s.faq);
      applyContact(s.contact);
      applyOrdersPaused(s.orders);
      applyAnnouncement(s.announcement);
      updateSeo(UNIT_PRICE, s.faq);
    }

    setImage("heroImg", s?.heroImage);
    setImage("instructionsImg", s?.instructionsImage);

    // Promo: solo se muestra si está activa, dentro de sus fechas y se puede calcular
    PROMO = s && isUsable(s.promo, UNIT_PRICE) ? s.promo : null;
    show($("promoBanner"), !!PROMO);
    if (PROMO) {
      $("promoLabel").textContent = PROMO.label || autoLabel(PROMO);
      $("promoDesc").textContent = PROMO.description || autoDescription(PROMO);
    }

    refreshTotal();
    revealPrices();
  };

  // Si la configuración tarda más de 3 segundos, mostramos lo que viene con la web
  const settingsTimeout = setTimeout(() => applySettings(null), 3000);
  fetch("/api/settings")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      clearTimeout(settingsTimeout);
      applySettings(s);
    })
    .catch(() => {
      clearTimeout(settingsTimeout);
      applySettings(null);
    });
})();
