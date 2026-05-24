(() => {
  const UNIT_PRICE = 15;
  const WA_NUMBER = "19083464064";
  const SMS_NUMBER = "19083464064";
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const qtyEl = document.getElementById("qtyInput");
  const totalEl = document.getElementById("priceTotal");
  const msgEl = document.getElementById("formMsg");
  const yearEl = document.getElementById("year");
  const orderForm = document.getElementById("orderForm");
  const submitBtn = document.getElementById("btnWhatsApp");
  const smsBtn = document.getElementById("btnSMS");
  const igBanner = document.getElementById("igBanner");
  const mainHeader = document.getElementById("mainHeader");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // === INSTAGRAM IN-APP BROWSER DETECTION ===
  const isInstagramBrowser = /Instagram/.test(navigator.userAgent);
  if (isInstagramBrowser && igBanner) {
    igBanner.classList.remove("hidden");
    if (mainHeader) {
      mainHeader.style.top = igBanner.offsetHeight + 16 + "px";
    }
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

  // === BUILD ORDER MESSAGE ===
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

  const showMsg = (text, color = "#16a34a") => {
    if (!msgEl) return;
    msgEl.style.color = color;
    msgEl.textContent = text;
  };

  const resetForm = (btnEl, label) => {
    setTimeout(() => {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = label;
      }
      orderForm?.reset();
      refreshTotal();
      if (msgEl) msgEl.textContent = "";
    }, 4000);
  };

  // === WHATSAPP SUBMIT (primary) ===
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    refreshTotal();
    if (msgEl) msgEl.textContent = "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Opening WhatsApp...";
    }

    const message = buildMessage(new FormData(orderForm));
    const waURL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(waURL, "_blank");

    showMsg("WhatsApp opened! Send the message to complete your order.");
    resetForm(submitBtn, "Send Order via WhatsApp");
  });

  // === SMS FALLBACK (secondary) ===
  smsBtn?.addEventListener("click", () => {
    if (!orderForm?.reportValidity()) return;
    refreshTotal();

    smsBtn.disabled = true;
    smsBtn.textContent = "Opening Messages...";

    const message = buildMessage(new FormData(orderForm));
    const smsURL = `sms:${SMS_NUMBER}&body=${encodeURIComponent(message)}`;
    window.open(smsURL, "_self");

    showMsg("Messages app should open. Send the text to complete your order.");
    resetForm(smsBtn, "Send via iMessage / SMS");
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
      { threshold: 0.15 },
    );
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("is-in"));
  }

  // === ACTIVE NAV LINKS ===
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = ["top", "instructions", "order"]
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
      { threshold: 0.55 },
    );
    sections.forEach((s) => nio.observe(s));
  }

  // === PARALLAX (con requestAnimationFrame) ===
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
})();
