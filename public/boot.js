document.documentElement.classList.add("js-ready");

// Fail open if the main bundle never finishes wiring up reveal states.
window.__revealFallbackTimer = window.setTimeout(() => {
  document.documentElement.classList.remove("js-ready");
}, 2000);
