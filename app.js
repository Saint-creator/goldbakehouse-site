"use strict";

const PRODUCTS = window.PRODUCTS || [];
const CART_KEY = "gold_bakehouse_cart_v1";

function $(sel) {
  return document.querySelector(sel);
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function asInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCart(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => ({
      id: typeof i?.id === "string" ? i.id : "",
      packs: clamp(asInt(i?.packs, 0), 1, 100),
    }))
    .filter((i) => i.id);
}

function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY));
    return normalizeCart(parsed);
  } catch {
    return [];
  }
}

function saveCart(items) {
  const safeItems = normalizeCart(items);
  localStorage.setItem(CART_KEY, JSON.stringify(safeItems));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((n, i) => n + i.packs, 0);
  const badge = $("#cart-count");
  if (badge) badge.textContent = String(count);
}

function addToCart(productId, packs) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const safePacks = clamp(asInt(packs, 1), 1, asInt(product.maxPacks, 1));
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) item.packs = clamp(item.packs + safePacks, 1, 100);
  else cart.push({ id: productId, packs: safePacks });
  saveCart(cart);
  alert("Added to cart!");
}

function openGalleryById(id) {
  const product = PRODUCTS.find((x) => x.id === id);
  if (product) openGallery(product);
}

function bindOpenHandler(el, productId) {
  const open = () => openGalleryById(productId);
  el.addEventListener("click", open);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
}

function createMissingMenuMessage(grid) {
  const msg = document.createElement("p");
  msg.className = "muted";
  msg.append("Menu data not loaded. Check that ");
  const strong = document.createElement("strong");
  strong.textContent = "assets/js/data.js";
  msg.appendChild(strong);
  msg.append(" is loading and that image paths are correct.");
  grid.replaceChildren(msg);
}

function createMenuCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.setAttribute("role", "button");
  thumb.tabIndex = 0;
  thumb.setAttribute("aria-label", `View ${product.name} photos`);

  const img = document.createElement("img");
  img.src = product.images?.[0] || "";
  img.alt = product.name;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    img.remove();
    thumb.classList.add("noimg");
    const noImg = document.createElement("div");
    noImg.className = "noimgText";
    noImg.textContent = product.name;
    thumb.replaceChildren(noImg);
  });
  thumb.appendChild(img);

  const content = document.createElement("div");
  content.className = "content";

  const row = document.createElement("div");
  row.className = "row";

  const name = document.createElement("strong");
  name.className = "product-name";
  name.setAttribute("role", "button");
  name.tabIndex = 0;
  name.textContent = product.name;

  const price = document.createElement("span");
  price.className = "price";
  price.textContent = money(product.price);

  row.append(name, price);

  const desc = document.createElement("p");
  desc.className = "muted";
  desc.textContent = product.description;

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.className = "tiny";
  summary.textContent = "Ingredients • Storing & Reheating";

  const ingredients = document.createElement("p");
  ingredients.className = "tiny";
  const ingredientsStrong = document.createElement("strong");
  ingredientsStrong.textContent = "Ingredients:";
  ingredients.append(ingredientsStrong, ` ${product.ingredients.join(", ")}`);

  const reheating = document.createElement("p");
  reheating.className = "tiny";
  const reheatingStrong = document.createElement("strong");
  reheatingStrong.textContent = "Reheating:";
  reheating.append(reheatingStrong, ` ${product.reheating}`);

  details.append(summary, ingredients, reheating);

  const qtyRow = document.createElement("div");
  qtyRow.className = "qty-row";

  const label = document.createElement("label");
  label.className = "tiny";
  const selectId = `packs-${product.id}`;
  label.setAttribute("for", selectId);
  label.textContent = `Packs (×${product.packSize})`;

  const select = document.createElement("select");
  select.id = selectId;

  const maxPacks = clamp(asInt(product.maxPacks, 1), 1, 20);
  for (let packs = 1; packs <= maxPacks; packs += 1) {
    const option = document.createElement("option");
    option.value = String(packs);
    option.textContent = `${packs * product.packSize} pcs`;
    select.appendChild(option);
  }

  qtyRow.append(label, select);

  const addBtn = document.createElement("button");
  addBtn.className = "add-btn";
  addBtn.type = "button";
  addBtn.textContent = "Add to cart";
  addBtn.addEventListener("click", () => {
    addToCart(product.id, select.value);
  });

  bindOpenHandler(thumb, product.id);
  bindOpenHandler(name, product.id);

  content.append(row, desc, details, qtyRow, addBtn);
  card.append(thumb, content);
  return card;
}

// ---------- Menu page ----------
function renderMenuPage() {
  const grid = $("#product-grid");
  if (!grid) return;

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    createMissingMenuMessage(grid);
    return;
  }

  grid.replaceChildren();
  PRODUCTS.forEach((product) => {
    grid.appendChild(createMenuCard(product));
  });
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

function getCartWithProducts() {
  return getCart()
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: item.packs * product.price,
      };
    })
    .filter(Boolean);
}

function renderCartPage() {
  const empty = $("#cart-empty");
  const wrap = $("#cart-table-wrap");
  const rows = $("#cart-rows");
  const totalNode = $("#cart-total");
  if (!empty || !wrap || !rows || !totalNode) return;

  const items = getCartWithProducts();
  if (!items.length) {
    empty.style.display = "";
    wrap.style.display = "none";
    return;
  }

  rows.replaceChildren();
  let total = 0;

  items.forEach((item) => {
    total += item.lineTotal;

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.product.name;

    const tdPacks = document.createElement("td");
    tdPacks.textContent = `${item.packs} pack${item.packs === 1 ? "" : "s"}`;

    const tdPrice = document.createElement("td");
    tdPrice.textContent = money(item.product.price);

    const tdSub = document.createElement("td");
    tdSub.className = "right";
    tdSub.textContent = money(item.lineTotal);

    const tdRemove = document.createElement("td");
    tdRemove.className = "right";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      const next = getCart().filter((i) => i.id !== item.id);
      saveCart(next);
      renderCartPage();
      renderCheckoutSummary();
    });
    tdRemove.appendChild(removeBtn);

    tr.append(tdName, tdPacks, tdPrice, tdSub, tdRemove);
    rows.appendChild(tr);
  });

  totalNode.textContent = money(total);
  empty.style.display = "none";
  wrap.style.display = "";
}

function renderCheckoutSummary() {
  const summary = $("#summary");
  if (!summary) return;

  const items = getCartWithProducts();
  summary.replaceChildren();

  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Your cart is empty. Please add items before checkout.";
    summary.appendChild(p);
    return;
  }

  let total = 0;

  items.forEach((item) => {
    total += item.lineTotal;
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.gap = "1rem";
    row.style.marginBottom = ".4rem";

    const name = document.createElement("div");
    name.textContent = `${item.product.name} × ${item.packs}`;

    const price = document.createElement("div");
    price.textContent = money(item.lineTotal);

    row.append(name, price);
    summary.appendChild(row);
  });

  const fulfillment = $("#fulfillment");
  const zone = $("#delivery-zone");
  let deliveryFee = 0;
  if (fulfillment && fulfillment.value === "delivery" && zone) {
    deliveryFee = asInt(zone.value, 0);
  }

  if (deliveryFee > 0) {
    const feeRow = document.createElement("div");
    feeRow.style.display = "flex";
    feeRow.style.justifyContent = "space-between";
    feeRow.style.gap = "1rem";
    feeRow.style.marginTop = ".4rem";
    feeRow.className = "muted";
    feeRow.textContent = `Delivery fee`;
    const feeValue = document.createElement("div");
    feeValue.textContent = money(deliveryFee);
    feeRow.appendChild(feeValue);
    summary.appendChild(feeRow);
    total += deliveryFee;
  }

  const totalRow = document.createElement("div");
  totalRow.style.display = "flex";
  totalRow.style.justifyContent = "space-between";
  totalRow.style.gap = "1rem";
  totalRow.style.marginTop = ".6rem";
  totalRow.style.fontWeight = "600";
  totalRow.textContent = "Total";
  const totalValue = document.createElement("div");
  totalValue.textContent = money(total);
  totalRow.appendChild(totalValue);
  summary.appendChild(totalRow);
}

function wireCheckoutControls() {
  const fulfillment = $("#fulfillment");
  const zoneWrap = $("#delivery-zone-wrap");
  const zone = $("#delivery-zone");
  if (!fulfillment || !zoneWrap) return;

  const sync = () => {
    const isDelivery = fulfillment.value === "delivery";
    zoneWrap.style.display = isDelivery ? "" : "none";
    if (!isDelivery && zone) zone.value = "";
    renderCheckoutSummary();
  };

  fulfillment.addEventListener("change", sync);
  if (zone) zone.addEventListener("change", renderCheckoutSummary);
  sync();
}

// =========================
// GALLERY MODAL
// =========================
let currentGallery = { images: [], index: 0 };

function openGallery(product) {
  const modal = document.getElementById("galleryModal");
  if (!modal) return;

  currentGallery.images = Array.isArray(product.images) ? product.images : [];
  currentGallery.index = 0;

  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalPrice").textContent =
    `$${product.price.toFixed(2)} • Pack of ${product.packSize}`;
  document.getElementById("modalDesc").textContent = product.description;

  renderDots();
  renderGalleryImage();

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeGallery() {
  const modal = document.getElementById("galleryModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderGalleryImage() {
  const img = document.getElementById("modalImg");
  const src = currentGallery.images[currentGallery.index];
  if (!img || !src) return;
  img.src = src;
  img.alt = `Product image ${currentGallery.index + 1}`;
  highlightDots();
}

function nextImg() {
  if (!currentGallery.images.length) return;
  currentGallery.index = (currentGallery.index + 1) % currentGallery.images.length;
  renderGalleryImage();
}

function prevImg() {
  if (!currentGallery.images.length) return;
  currentGallery.index =
    (currentGallery.index - 1 + currentGallery.images.length) % currentGallery.images.length;
  renderGalleryImage();
}

function renderDots() {
  const dotsWrap = document.getElementById("modalDots");
  if (!dotsWrap) return;

  dotsWrap.replaceChildren();
  currentGallery.images.forEach((_, i) => {
    const d = document.createElement("div");
    d.className = "dot" + (i === currentGallery.index ? " active" : "");
    d.addEventListener("click", () => {
      currentGallery.index = i;
      renderGalleryImage();
    });
    dotsWrap.appendChild(d);
  });
}

function highlightDots() {
  const dots = document.querySelectorAll("#modalDots .dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === currentGallery.index));
}

window.addEventListener("DOMContentLoaded", () => {
  updateCartCount();

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a[data-link]").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === path);
  });

  renderMenuPage();
  renderCartPage();
  renderCheckoutSummary();
  wireCheckoutControls();

  const closeBtn = document.getElementById("modalClose");
  const prevBtn = document.getElementById("modalPrev");
  const nextBtn = document.getElementById("modalNext");
  const modal = document.getElementById("galleryModal");
  const clearBtn = document.getElementById("clear-cart");

  if (closeBtn) closeBtn.addEventListener("click", closeGallery);
  if (prevBtn) prevBtn.addEventListener("click", prevImg);
  if (nextBtn) nextBtn.addEventListener("click", nextImg);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeGallery();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      saveCart([]);
      renderCartPage();
      renderCheckoutSummary();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!modal || !modal.classList.contains("show")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowRight") nextImg();
    if (e.key === "ArrowLeft") prevImg();
  });
});
