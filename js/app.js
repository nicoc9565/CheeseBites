(() => {
  const UNIT_PRICE = 15;
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const qtyEl = document.getElementById("qtyInput");
  const totalEl = document.getElementById("priceTotal");
  const msgEl = document.getElementById("formMsg");
  const yearEl = document.getElementById("year");
  const orderForm = document.getElementById("orderForm");
  const submitBtn = orderForm
    ? orderForm.querySelector('button[type="submit"]')
    : null;

  if (yearEl) yearEl.textContent = new Date().getFullYear();

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

  // === ENVÍO POR iMESSAGE / SMS ===
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    refreshTotal();

    if (msgEl) msgEl.textContent = "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Opening app...";
    }

    const data = new FormData(orderForm);
    const payload = {
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      address: data.get("address"),
      qty: data.get("quantity"),
      notes: data.get("notes") || "No notes",
      total: Number(data.get("quantity")) * UNIT_PRICE,
    };

    const message =
      `🧀 *NEW CHEESE BITES ORDER* 🧀\n\n` +
      `*Name:* ${payload.name}\n` +
      `*Phone:* ${payload.phone}\n` +
      `*Address:* ${payload.address}\n\n` +
      `*Order:* ${payload.qty} boxes ($${payload.total})\n` +
      `*Notes:* ${payload.notes}`;

    const myPhoneNumber = "5493764138482";
    const smsURL = `sms:+${myPhoneNumber}?body=${encodeURIComponent(message)}`;

    window.open(smsURL, "_self");

    if (msgEl) {
      msgEl.style.color = "#16a34a";
      msgEl.textContent = "Opening your Messages app...";
    }

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Order Request";
      }
      orderForm.reset();
      refreshTotal();
    }, 2000);
  });

  // === ANIMACIONES REVEAL ===
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

  // === NAVEGACIÓN ACTIVA ===
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

  // === EFECTO DE CÍRCULOS (PARALLAX) ===
  const circles = document.querySelector(".global-circles");
  if (!prefersReduced && circles) {
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY * 0.1; // Efecto un poco más notable
        circles.style.transform = `translate3d(0, ${-y}px, 0)`;
      },
      { passive: true },
    );
  }
})();
