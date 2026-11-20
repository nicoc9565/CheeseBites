(() => {
  let UNIT_PRICE = 15;
  let PROMO = null;
  const { calc, fmt, isUsable, autoLabel, autoDescription } = window.CBPromo;
  // Contacto: vienen de la web y se reemplazan por lo que el dueño guarde en el panel
  let SMS_NUMBER = "+19083464064";
  let WA_NUMBER = "19083464064";
  let ORDER_EMAIL = "cheesebitesllc@gmail.com";

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
  const isAndroid = /Android/i.test(navigator.userAgent);
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const qtyEl = document.getElementById("qtyInput");
  const totalEl = document.getElementById("priceTotal");
  const yearEl = document.getElementById("year");
  const orderForm = document.getElementById("orderForm");
  const submitBtn = document.getElementById("btnWhatsApp");
  const smsBtn = document.getElementById("btnSMS");
  const emailBtn = document.getElementById("btnEmail");
  const igBanner = document.getElementById("igBanner");
  const mainHeader = document.getElementById("mainHeader");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const orderConfirmation = document.getElementById("orderConfirmation");
  const btnNewOrder = document.getElementById("btnNewOrder");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // === INSTAGRAM IAB ===
  const isInstagramIAB = /Instagram/.test(navigator.userAgent);
  if (isInstagramIAB && igBanner) {
    igBanner.classList.remove("hidden");
    if (mainHeader) mainHeader.style.top = igBanner.offsetHeight + 16 + "px";

    // SMS/iMessage doesn't work in Instagram's browser — hide it,
    // promote WhatsApp as primary, and show Email as a second option
    if (smsBtn) smsBtn.classList.add("hidden");
    if (submitBtn) {
      submitBtn.className =
        "w-full btn-lift rounded-2xl bg-[#25D366] px-5 py-5 text-base font-black uppercase tracking-widest text-white hover:brightness-95 shadow-xl shadow-[#25D366]/30 flex items-center justify-center gap-3";
    }
    if (emailBtn) emailBtn.classList.remove("hidden");
  }
  document.getElementById("igBannerClose")?.addEventListener("click", () => {
    igBanner?.classList.add("hidden");
    if (mainHeader) mainHeader.style.top = "1rem";
  });

  // === MOBILE MENU ===
  menuBtn?.addEventListener("click", () => {
    const isOpen = !mobileMenu?.classList.contains("hidden");
    mobileMenu?.classList.toggle("hidden", isOpen);
    menuBtn.setAttribute("aria-expanded", String(!isOpen));
  });
  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      menuBtn?.setAttribute("aria-expanded", "false");
    });
  });

  // === QUANTITY ===
  const clampQty = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  };
  const priceOriginal = document.getElementById("priceOriginal");
  const priceOriginalValue = document.getElementById("priceOriginalValue");
  const promoSavings = document.getElementById("promoSavings");
  const promoHint = document.getElementById("promoHint");

  const refreshTotal = () => {
    if (!qtyEl || !totalEl) return;
    const q = clampQty(qtyEl.value || 1);
    qtyEl.value = String(q);
    const r = calc(q, UNIT_PRICE, PROMO);
    totalEl.textContent = fmt(r.total);
    // Con promo aplicada: precio tachado + "You save $X"
    priceOriginal?.classList.toggle("hidden", !r.applied);
    if (priceOriginalValue) priceOriginalValue.textContent = fmt(r.subtotal);
    promoSavings?.classList.toggle("hidden", !r.applied);
    if (promoSavings) promoSavings.textContent = `🎉 You save $${fmt(r.savings)}`;
    // Sin promo aplicada todavía: "Add 1 more box to get the 2x1 Deal!"
    promoHint?.classList.toggle("hidden", !r.hint);
    if (promoHint) promoHint.textContent = r.hint;
  };
  window.stepQty = (delta) => {
    if (!qtyEl) return;
    const q = clampQty(qtyEl.value || 1) + Number(delta || 0);
    qtyEl.value = String(clampQty(q));
    refreshTotal();
  };
  qtyEl?.addEventListener("input", refreshTotal);
  refreshTotal();

  // === FORM VALIDATION ===
  const VALIDATORS = {
    fieldName: {
      check: (v) => v.trim().length >= 2,
      msg: "Please enter your full name",
    },
    fieldPhone: {
      check: (v) => /^\+?[\d\s\-().]{7,}$/.test(v.trim()),
      msg: "Please enter a valid phone number",
    },
    fieldEmail: {
      check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      msg: "Please enter a valid email address",
    },
    fieldAddress: {
      check: (v) => v.trim().length >= 5,
      msg: "Please enter your delivery address",
    },
  };

  const getGroup = (el) => el.closest(".field-group");

  const validateField = (el) => {
    const rule = VALIDATORS[el.id];
    if (!rule) return true;
    const valid = rule.check(el.value);
    const group = getGroup(el);
    const errEl = document.getElementById(el.id + "Error");
    group?.classList.toggle("is-valid", valid);
    group?.classList.toggle("is-error", !valid);
    if (errEl) errEl.textContent = valid ? "" : rule.msg;
    return valid;
  };

  const validateAll = () =>
    Object.keys(VALIDATORS)
      .map((id) => {
        const el = document.getElementById(id);
        return el ? validateField(el) : true;
      })
      .every(Boolean);

  Object.keys(VALIDATORS).forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener("blur", () => validateField(el));
    el?.addEventListener("input", () => {
      if (getGroup(el)?.classList.contains("is-error")) validateField(el);
    });
  });

  // === CONFIRMATION OVERLAY ===
  const CONFIRM_MSGS = {
    sms: "Your Messages app should have opened — just hit <strong>Send</strong> to complete your order. We'll confirm your delivery shortly!",
    whatsapp: "WhatsApp should have opened with your order — just hit <strong>Send</strong> and we'll confirm your delivery shortly!",
    email: "Your mail app should have opened with your order — just hit <strong>Send</strong> and we'll confirm your delivery shortly!",
  };
  const showConfirmation = (channel = "sms") => {
    if (!orderConfirmation) return;
    const msgEl = document.getElementById("orderConfirmMsg");
    if (msgEl) msgEl.innerHTML = CONFIRM_MSGS[channel] || CONFIRM_MSGS.sms;
    orderConfirmation.classList.remove("hidden");
    orderConfirmation
      .closest("section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetValidation = () => {
    Object.keys(VALIDATORS).forEach((id) => {
      const el = document.getElementById(id);
      const group = el ? getGroup(el) : null;
      group?.classList.remove("is-valid", "is-error");
      const errEl = document.getElementById(id + "Error");
      if (errEl) errEl.textContent = "";
    });
  };

  btnNewOrder?.addEventListener("click", () => {
    orderConfirmation?.classList.add("hidden");
    orderForm?.reset();
    refreshTotal();
    resetValidation();
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  });

  // === ORDER MESSAGE ===
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

  // === iMESSAGE / SMS (primary) ===
  smsBtn?.addEventListener("click", () => {
    if (!validateAll()) {
      document.querySelector(".field-group.is-error .field-input")?.focus();
      return;
    }
    refreshTotal();
    smsBtn.disabled = true;
    smsBtn.textContent = "Opening Messages...";
    const formData = new FormData(orderForm);
    trackOrder("sms", formData);
    const message = buildMessage(formData);
    // iPhone usa "&body=" y Android "?body="
    const sep = isAndroid ? "?" : "&";
    window.location.href = `sms:${SMS_NUMBER}${sep}body=${encodeURIComponent(message)}`;
    setTimeout(() => {
      smsBtn.disabled = false;
      smsBtn.innerHTML =
        `<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">` +
        `<path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>` +
        ` Send Order via iMessage / SMS`;
      showConfirmation("sms");
    }, 1200);
  });

  // === WHATSAPP (secondary) ===
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateAll()) {
      document.querySelector(".field-group.is-error .field-input")?.focus();
      return;
    }
    refreshTotal();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Opening WhatsApp...";
    }
    const formData = new FormData(orderForm);
    trackOrder("whatsapp", formData);
    const message = buildMessage(formData);
    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          `<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">` +
          `<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>` +
          `</svg> Send via WhatsApp`;
      }
      showConfirmation("whatsapp");
    }, 1200);
  });

  // === EMAIL (Instagram IAB fallback) ===
  emailBtn?.addEventListener("click", () => {
    if (!validateAll()) {
      document.querySelector(".field-group.is-error .field-input")?.focus();
      return;
    }
    refreshTotal();
    emailBtn.disabled = true;
    emailBtn.textContent = "Opening Mail…";
    const formData = new FormData(orderForm);
    trackOrder("email", formData);
    const message = buildMessage(formData);
    const subject = encodeURIComponent("🧀 New Cheese Bites Order");
    const body = encodeURIComponent(message);
    window.open(`mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`, "_self");
    setTimeout(() => {
      emailBtn.disabled = false;
      emailBtn.innerHTML =
        `<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">` +
        `<path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>` +
        `</svg> Send Order via Email`;
      showConfirmation("email");
    }, 1200);
  });

  // === FLOATING ORDER BUTTON (mobile) ===
  const floatingOrder = document.getElementById("floatingOrder");
  if (floatingOrder) {
    const heroSection = document.getElementById("top");
    const orderSection = document.getElementById("order");
    const showFloat = () => {
      floatingOrder.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
      floatingOrder.classList.add("translate-y-0", "opacity-100");
      floatingOrder.removeAttribute("aria-hidden");
    };
    const hideFloat = () => {
      floatingOrder.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
      floatingOrder.classList.remove("translate-y-0", "opacity-100");
      floatingOrder.setAttribute("aria-hidden", "true");
    };
    const floatObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.target === heroSection && !en.isIntersecting) showFloat();
          if (en.target === heroSection && en.isIntersecting) hideFloat();
          if (en.target === orderSection && en.isIntersecting) hideFloat();
          if (en.target === orderSection && !en.isIntersecting && window.scrollY > orderSection.offsetTop) showFloat();
        });
      },
      { threshold: 0.2 },
    );
    if (heroSection) floatObserver.observe(heroSection);
    if (orderSection) floatObserver.observe(orderSection);
  }

  // === FAQ ACCORDION ===
  document.getElementById("faqList")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq-question");
    if (!btn) return;
    {
      const item = btn.closest(".faq-item");
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".faq-item").forEach((other) => {
        other.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
        other.querySelector(".faq-answer")?.classList.remove("is-open");
        other.querySelector(".faq-icon")?.classList.remove("rotate-180");
      });

      if (!isOpen) {
        btn.setAttribute("aria-expanded", "true");
        item?.querySelector(".faq-answer")?.classList.add("is-open");
        item?.querySelector(".faq-icon")?.classList.add("rotate-180");
      }
    }
  });

  // === REVEAL ANIMATIONS ===
  const reveals = document.querySelectorAll(".reveal");
  if (!prefersReduced && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("is-in"));
  }

  // === ACTIVE NAV ===
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = ["top", "instructions", "order", "faq", "gallery"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const setActive = (id) => {
    navLinks.forEach((a) =>
      a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`),
    );
  };
  if (!prefersReduced && sections.length) {
    const nio = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(en.target.id);
        });
      },
      { threshold: 0.4 },
    );
    sections.forEach((s) => nio.observe(s));
  }

  // === GLASS NAVBAR ===
  const navPill = document.getElementById("navPill");
  if (navPill) {
    const updateGlass = () => {
      navPill.classList.toggle("scrolled", window.scrollY > 60);
    };
    window.addEventListener("scroll", updateGlass, { passive: true });
    updateGlass();
  }

  // === PARALLAX ===
  const circles = document.querySelector(".global-circles");
  if (!prefersReduced && circles) {
    let rafId = null;
    window.addEventListener(
      "scroll",
      () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          circles.style.transform = `translate3d(0, ${-window.scrollY * 0.1}px, 0)`;
          rafId = null;
        });
      },
      { passive: true },
    );
  }

  // === DYNAMIC SETTINGS (price, promo, images) ===
  const revealPrices = () => {
    document.querySelectorAll(".js-price-loading").forEach((el) => el.classList.remove("js-price-loading"));
  };

  // Foto del panel si hay; si no (o si falla), la que viene con la web
  const setImage = (id, url) => {
    const img = document.getElementById(id);
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
    const parts = text.split(/([^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,})/i);
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const link = document.createElement("a");
        link.href = `mailto:${part}`;
        link.className = "text-[#75aadb] font-semibold underline";
        link.textContent = part;
        p.append(link);
      } else if (part) {
        p.append(document.createTextNode(part));
      }
    });
  };

  const renderFaq = (faq) => {
    const list = document.getElementById("faqList");
    const template = list?.querySelector(".faq-item");
    if (!list || !template || !Array.isArray(faq) || faq.length === 0) return;
    const items = faq.map(({ q, a }) => {
      const item = template.cloneNode(true);
      item.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
      item.querySelector(".faq-answer")?.classList.remove("is-open");
      item.querySelector(".faq-icon")?.classList.remove("rotate-180");
      item.querySelector(".faq-question span").textContent = q;
      fillAnswer(item.querySelector(".faq-answer p"), faqAnswerText(a));
      return item;
    });
    list.replaceChildren(...items);
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
    }
    if (c.email) {
      ORDER_EMAIL = c.email;
      for (const id of ["orderEmailLink", "footerEmailLink"]) {
        const el = document.getElementById(id);
        if (el) el.href = `mailto:${c.email}`;
      }
      const orderEmail = document.getElementById("orderEmailLink");
      if (orderEmail) orderEmail.textContent = c.email;
      const footerEmail = document.getElementById("footerEmailText");
      if (footerEmail) footerEmail.textContent = c.email;
    }
    const box = document.getElementById("footerPhones");
    const tpl = box?.querySelector("a");
    if (box && tpl && Array.isArray(c.phones) && c.phones.length) {
      box.replaceChildren(
        ...c.phones.map((ph, i) => {
          const a = tpl.cloneNode(true);
          a.href = `tel:${ph}`;
          a.textContent = prettyPhone(ph);
          a.classList.toggle("mt-0.5", i > 0);
          return a;
        }),
      );
    }
  };

  // Pedidos pausados: se oculta el formulario y se muestra el mensaje del dueño
  const applyOrdersPaused = (orders) => {
    const paused = !!orders?.paused;
    document.getElementById("ordersPaused")?.classList.toggle("hidden", !paused);
    orderForm?.classList.toggle("hidden", paused);
    const msg = document.getElementById("ordersPausedMsg");
    if (msg) {
      msg.textContent =
        orders?.message || "We're not taking orders right now. Follow us on Instagram to know when we're back!";
    }
  };

  const applyAnnouncement = (ann) => {
    const bar = document.getElementById("announceBar");
    if (!bar) return;
    const show = !!(ann?.active && ann.text);
    bar.classList.toggle("hidden", !show);
    if (show) document.getElementById("announceText").textContent = ann.text;
  };

  const applySettings = (s) => {
    if (s && s.price > 0) {
      UNIT_PRICE = Number(s.price);
      document.querySelectorAll(".js-price").forEach((el) => {
        el.textContent = fmt(UNIT_PRICE);
      });
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
    const banner = document.getElementById("promoBanner");
    if (banner) {
      banner.classList.toggle("hidden", !PROMO);
      if (PROMO) {
        document.getElementById("promoLabel").textContent = PROMO.label || autoLabel(PROMO);
        document.getElementById("promoDesc").textContent = PROMO.description || autoDescription(PROMO);
      }
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
