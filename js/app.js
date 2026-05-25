(() => {
  let UNIT_PRICE = 15;
  const WA_NUMBER = "19083464064";
  const SMS_NUMBER = "19083464064";
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const qtyEl = document.getElementById("qtyInput");
  const totalEl = document.getElementById("priceTotal");
  const yearEl = document.getElementById("year");
  const orderForm = document.getElementById("orderForm");
  const submitBtn = document.getElementById("btnWhatsApp");
  const smsBtn = document.getElementById("btnSMS");
  const igBanner = document.getElementById("igBanner");
  const mainHeader = document.getElementById("mainHeader");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const orderConfirmation = document.getElementById("orderConfirmation");
  const btnNewOrder = document.getElementById("btnNewOrder");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // === INSTAGRAM IAB ===
  if (/Instagram/.test(navigator.userAgent) && igBanner) {
    igBanner.classList.remove("hidden");
    if (mainHeader) mainHeader.style.top = igBanner.offsetHeight + 16 + "px";
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
  const refreshTotal = () => {
    if (!qtyEl || !totalEl) return;
    const q = clampQty(qtyEl.value || 1);
    qtyEl.value = String(q);
    totalEl.textContent = String(q * UNIT_PRICE);
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
  const showConfirmation = () => {
    if (!orderConfirmation) return;
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
    const qty = data.get("quantity");
    const total = Number(qty) * UNIT_PRICE;
    return (
      `🧀 NEW CHEESE BITES ORDER 🧀\n\n` +
      `Name: ${data.get("name")}\n` +
      `Phone: ${data.get("phone")}\n` +
      `Email: ${data.get("email")}\n` +
      `Address: ${data.get("address")}\n\n` +
      `Order: ${qty} box${Number(qty) > 1 ? "es" : ""} ($${total})\n` +
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
    const message = buildMessage(new FormData(orderForm));
    window.open(`sms:${SMS_NUMBER}&body=${encodeURIComponent(message)}`, "_self");
    setTimeout(() => {
      smsBtn.disabled = false;
      smsBtn.innerHTML =
        `<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">` +
        `<path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>` +
        ` Send Order via iMessage / SMS`;
      showConfirmation();
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
    const message = buildMessage(new FormData(orderForm));
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
      showConfirmation();
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
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
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
    });
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
  const sections = ["top", "instructions", "order", "reviews", "faq", "gallery"]
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
  fetch("/api/settings")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      if (!s) return;

      // Price
      if (s.price && s.price !== UNIT_PRICE) {
        UNIT_PRICE = s.price;
        refreshTotal();
      }
      const displayPrice = document.getElementById("displayPrice");
      if (displayPrice) displayPrice.textContent = String(s.price || 15);

      // Hero image
      if (s.heroImage) {
        const heroImg = document.getElementById("heroImg");
        const heroWebp = document.getElementById("heroImgWebp");
        if (heroImg) heroImg.src = s.heroImage;
        if (heroWebp) heroWebp.srcset = s.heroImage;
        const orderImg = document.getElementById("orderImg");
        if (orderImg) orderImg.src = s.heroImage;
      }

      // Instructions image
      if (s.instructionsImage) {
        const instImg = document.getElementById("instructionsImg");
        const instWebp = document.getElementById("instructionsImgWebp");
        if (instImg) instImg.src = s.instructionsImage;
        if (instWebp) instWebp.srcset = s.instructionsImage;
      }

      // Promo banner
      if (s.promo?.active) {
        const banner = document.getElementById("promoBanner");
        const label = document.getElementById("promoLabel");
        const desc = document.getElementById("promoDesc");
        if (banner) banner.classList.remove("hidden");
        if (label) label.textContent = s.promo.label || "";
        if (desc) desc.textContent = s.promo.description || "";
      }
    })
    .catch(() => {});
})();
