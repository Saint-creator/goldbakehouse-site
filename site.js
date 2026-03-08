"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const yearNode = document.getElementById("year");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());

  document.querySelectorAll(".nav-toggle").forEach((btn) => {
    const header = btn.closest("header");
    const navId = btn.getAttribute("aria-controls");
    const nav = navId ? document.getElementById(navId) : null;

    const setExpanded = (expanded) => {
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (header) header.classList.toggle("nav-open", expanded);
    };

    setExpanded(false);

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      setExpanded(!expanded);
    });

    if (nav) {
      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setExpanded(false));
      });
    }
  });

});
