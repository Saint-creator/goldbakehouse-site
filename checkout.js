"use strict";

const CHECKOUT_CART_KEY = "gold_bakehouse_cart_v1";

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
    const parsed = JSON.parse(localStorage.getItem(CHECKOUT_CART_KEY));
    return normalizeCart(parsed);
  } catch {
    return [];
  }
}

function getCartLineItems() {
  const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  return getCart()
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) return null;
      return {
        name: product.name,
        quantity: String(item.packs),
        unitAmount: Math.round(Number(product.price) * 100),
        packSize: product.packSize,
      };
    })
    .filter(Boolean);
}

function getCheckoutDetails(form) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    fulfillment: String(data.get("fulfillment") || "pickup"),
    deliveryZone: String(data.get("delivery-zone") || ""),
    address: String(data.get("address") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
  };
}

function setStatus(text, isError = false) {
  const status = document.getElementById("payment-status");
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? "#a12222" : "#2f6f2f";
}

function syncFulfillmentUI() {
  const fulfillment = document.getElementById("fulfillment");
  const pickupWrap = document.getElementById("pickup-address-wrap");
  const deliveryWrap = document.getElementById("delivery-zone-wrap");
  if (!fulfillment) return;

  const isDelivery = fulfillment.value === "delivery";
  if (pickupWrap) pickupWrap.style.display = isDelivery ? "none" : "";
  if (deliveryWrap) deliveryWrap.style.display = isDelivery ? "" : "none";
}

async function initSquarePayments() {
  const config = document.getElementById("square-config");
  const button = document.getElementById("card-button");
  const form = document.getElementById("checkout-form");
  if (!config || !button || !form) return;

  const appId = config.dataset.appId || "";
  const locationId = config.dataset.locationId || "";
  if (!appId || !locationId || appId.includes("YOUR_SQUARE")) {
    setStatus("Square is not configured yet.", true);
    button.disabled = true;
    return;
  }

  if (!window.Square || !window.Square.payments) {
    setStatus("Square Payments SDK failed to load.", true);
    button.disabled = true;
    return;
  }

  const payments = window.Square.payments(appId, locationId);
  const card = await payments.card();
  await card.attach("#card-container");

  const fulfillment = document.getElementById("fulfillment");
  if (fulfillment) fulfillment.addEventListener("change", syncFulfillmentUI);
  syncFulfillmentUI();

  button.addEventListener("click", async () => {
    if (!form.reportValidity()) return;

    const lineItems = getCartLineItems();
    if (!lineItems.length) {
      setStatus("Your cart is empty. Please add items first.", true);
      return;
    }

    const details = getCheckoutDetails(form);
    if (details.fulfillment === "delivery") {
      if (!details.deliveryZone) {
        setStatus("Please select a delivery zone.", true);
        return;
      }
      if (!details.address) {
        setStatus("Please enter a delivery address.", true);
        return;
      }
    }

    button.disabled = true;
    setStatus("Processing payment...");

    const result = await card.tokenize();
    if (result.status !== "OK") {
      setStatus("Payment details are invalid. Please try again.", true);
      button.disabled = false;
      return;
    }

    const payload = {
      token: result.token,
      lineItems,
      buyer: {
        name: details.name,
        email: details.email,
        phone: details.phone,
      },
      fulfillment: details.fulfillment,
      deliveryZone: details.deliveryZone,
      address: details.address,
      notes: details.notes,
    };

    try {
      const response = await fetch("api/square-payment.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus(data?.error || "Payment failed. Please try again.", true);
        button.disabled = false;
        return;
      }

      localStorage.removeItem(CHECKOUT_CART_KEY);
      setStatus("Payment successful! Redirecting to the home page...", false);
      const success = document.createElement("p");
      success.className = "tiny";
      success.style.color = "#2f6f2f";
      success.style.marginTop = ".6rem";
      success.textContent = "Thanks for your order. You’ll be redirected shortly.";
      const statusEl = document.getElementById("payment-status");
      if (statusEl && !statusEl.dataset.successShown) {
        statusEl.dataset.successShown = "true";
        statusEl.after(success);
      }
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } catch {
      setStatus("Payment failed. Please try again.", true);
      button.disabled = false;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initSquarePayments();
});
