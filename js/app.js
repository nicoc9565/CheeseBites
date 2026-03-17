(() => {
  const UNIT_PRICE = 15;
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const qtyEl = document.getElementById("qtyInput");
  const totalEl = document.getElementById("priceTotal");
  const msgEl = document.getElementById("formMsg");
  const yearEl = document.getElementById("year");

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

  // Inline buttons +/-
  window.stepQty = (delta) => {
    if (!qtyEl) return;
    const q = clampQty(qtyEl.value || 1) + Number(delta || 0);
    qtyEl.value = String(clampQty(q));
    refreshTotal();
  };

  qtyEl?.addEventListener("input", refreshTotal);
  refreshTotal();

  document.getElementById("orderForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    refreshTotal();

    const data = new FormData(e.target);
    const payload = {
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      address: data.get("address"),
      quantity: Number(data.get("quantity")),
      notes: data.get("notes") || "",
      total: Number(data.get("quantity")) * UNIT_PRICE,
    };

    if (msgEl) {
      msgEl.textContent =
        "Order received (demo UI). Connect this form to email automation. Payload: " +
        JSON.stringify(payload);
    }
  });

  // Reveal animations
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
  // Nav active + subtle background parallax
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
  } else {
    setActive("top");
  }

  const circles = document.querySelector(".global-circles");
  if (!prefersReduced && circles) {
    window.addEventListener(
      "scroll",
      () => {
        const y = Math.min(24, window.scrollY * 0.03);
        circles.style.transform = `translate3d(0, ${y}px, 0)`;
      },
      { passive: true },
    );
  }
})();
