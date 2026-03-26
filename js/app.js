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

  // Inline buttons +/-
  window.stepQty = (delta) => {
    if (!qtyEl) return;
    const q = clampQty(qtyEl.value || 1) + Number(delta || 0);
    qtyEl.value = String(clampQty(q));
    refreshTotal();
  };

  qtyEl?.addEventListener("input", refreshTotal);
  refreshTotal();

  // === LÓGICA DE ENVÍO A WHATSAPP / iMESSAGE ===
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    refreshTotal();

    // Cambiar estado del botón
    if (msgEl) msgEl.textContent = "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Opening app...";
    }

    // Recolectar datos del formulario
    const data = new FormData(orderForm);
    const name = data.get("name");
    const phone = data.get("phone");
    const email = data.get("email");
    const address = data.get("address");
    const quantity = data.get("quantity");
    const notes = data.get("notes") || "No extra notes";
    const total = Number(quantity) * UNIT_PRICE;

    // 1. Construir el mensaje de texto (con emojis y negritas para WhatsApp)
    const message =
      `🧀 *NEW CHEESE BITES ORDER* 🧀\n\n` +
      `*Name:* ${name}\n` +
      `*Phone:* ${phone}\n` +
      `*Email:* ${email}\n` +
      `*Delivery Address:* ${address}\n\n` +
      `*Quantity:* ${quantity} boxes\n` +
      `*Total Amount:* $${total}\n\n` +
      `*Notes:* ${notes}`;

    // 2. Codificar el mensaje para que sea válido en una URL (cambia espacios por %20, etc.)
    const encodedMessage = encodeURIComponent(message);

    // 3. Tu número de teléfono (IMPORTANTE: incluir el código de país, "1" para USA, sin símbolos)
    const myPhoneNumber = "5493764138482";

    // ----------------------------------------------------------------------
    // OPCIÓN A: WHATSAPP (RECOMENDADO)
    // ----------------------------------------------------------------------
    // const whatsappURL = `https://wa.me/${myPhoneNumber}?text=${encodedMessage}`;
    // window.open(whatsappURL, "_blank");

    // ----------------------------------------------------------------------
    // OPCIÓN B: iMESSAGE / SMS (ACTIVA)
    // ----------------------------------------------------------------------
    // Usamos ?body= para que coloque todo el texto del pedido en el área de escritura
    const smsURL = `sms:+${myPhoneNumber}?body=${encodedMessage}`;
    window.open(smsURL, "_self");

    // Dar feedback visual en la web
    if (msgEl) {
      msgEl.style.color = "#16a34a"; // Verde
      msgEl.textContent = "Opening your Messages app...";
    }

    // Restaurar el botón para futuras compras
    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Order Request";
      }
      orderForm.reset();
      refreshTotal();
    }, 2000);
  });

  // === ANIMACIONES Y EXTRAS ===
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
