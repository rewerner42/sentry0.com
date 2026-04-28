const root = document.documentElement;
const topbarShell = document.querySelector(".topbar-shell");
const brandLink = document.querySelector(".brand[href^='#']");
const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
const navLocationLinks = navLinks.filter((link) => !link.classList.contains("nav-contact"));
const scrollLinks = Array.from(document.querySelectorAll("a[href^='#']:not([href='#'])"));
const revealNodes = Array.from(document.querySelectorAll(".reveal"));
const form = document.querySelector("#contact-form");
const statusNode = document.querySelector("#form-status");
const submitButton = form?.querySelector("button[type='submit']");
const filterButtons = Array.from(document.querySelectorAll(".matrix-filter"));
const matrixRows = Array.from(document.querySelectorAll(".capability-matrix [data-domain]"));
const uptimeNode = document.querySelector("[data-uptime]");
const nowNode = document.querySelector("[data-now]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const trackedNavLinks = [brandLink, ...navLocationLinks].filter(Boolean);
const HEADER_PROGRESS_RANGE = 96;
const launchedAt = Date.now() - 1000 * 60 * 54 - 1000 * 11;

let revealObserver;
let scrollTicking = false;
let focusTimeoutId = 0;

const linkedTargets = Array.from(
  new Map(
    trackedNavLinks
      .map((link) => {
        const hash = link.getAttribute("href");
        const target = getTargetFromHash(hash);
        return hash && target ? [hash, { hash, target }] : null;
      })
      .filter(Boolean)
  ).values()
);

function getTargetFromHash(hash) {
  if (!hash || hash === "#") return null;

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

function getHeaderOffset() {
  const headerHeight = topbarShell ? topbarShell.getBoundingClientRect().height : 0;
  return Math.ceil(headerHeight + 18);
}

function syncHeaderOffset() {
  root.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
}

function getScrollAnchor(target) {
  if (target.matches("main")) return target;
  return target.querySelector("[data-scroll-anchor], h1, h2, h3") || target;
}

function getDocumentTop(node) {
  let top = 0;
  let currentNode = node;

  while (currentNode) {
    top += currentNode.offsetTop;
    currentNode = currentNode.offsetParent;
  }

  return top;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMaxScrollTop() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function setCurrentNav(hash) {
  for (const link of trackedNavLinks) {
    if (link.getAttribute("href") === hash) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function updateHeaderState() {
  if (!topbarShell) return;

  const progress = clamp(window.scrollY / HEADER_PROGRESS_RANGE, 0, 1);
  topbarShell.style.setProperty("--header-progress", progress.toFixed(3));
}

function updateCurrentNav() {
  if (!linkedTargets.length) return;

  if (Math.ceil(window.scrollY) >= Math.floor(getMaxScrollTop())) {
    setCurrentNav(linkedTargets[linkedTargets.length - 1].hash);
    return;
  }

  const probe = Math.ceil(window.scrollY + getHeaderOffset() + 4);
  let currentHash = linkedTargets[0].hash;

  for (const { hash, target } of linkedTargets) {
    const anchorTop = Math.floor(getDocumentTop(getScrollAnchor(target)));
    if (probe >= anchorTop) currentHash = hash;
  }

  setCurrentNav(currentHash);
}

function requestPageStateUpdate() {
  if (scrollTicking) return;

  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateHeaderState();
    syncHeaderOffset();
    updateCurrentNav();
    scrollTicking = false;
  });
}

function getFocusTarget(target) {
  if (target.matches("main, h1, h2, h3")) {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    return target;
  }

  const heading = target.querySelector("h1, h2, h3");
  const focusTarget = heading || target;
  if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
  return focusTarget;
}

function focusTarget(target) {
  window.clearTimeout(focusTimeoutId);
  const destination = getFocusTarget(target);
  const delay = prefersReducedMotion.matches ? 0 : 140;

  focusTimeoutId = window.setTimeout(() => {
    destination.focus({ preventScroll: true });
  }, delay);
}

function scrollToHash(hash, { updateHistory = false, focus = true, behavior } = {}) {
  const target = getTargetFromHash(hash);
  if (!target) return;

  syncHeaderOffset();

  if (updateHistory && window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }

  const top = clamp(getDocumentTop(getScrollAnchor(target)) - getHeaderOffset(), 0, getMaxScrollTop());
  const finalBehavior = behavior || (prefersReducedMotion.matches ? "auto" : "smooth");

  window.scrollTo({ top, behavior: finalBehavior });
  setCurrentNav(hash);

  if (focus) {
    focusTarget(target);
  }
}

function handleHashLinkClick(event) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const link = event.currentTarget;
  const hash = link.getAttribute("href");
  if (!getTargetFromHash(hash)) return;

  event.preventDefault();
  scrollToHash(hash, {
    updateHistory: true,
    behavior: link.dataset.scrollBehavior === "instant" ? "auto" : undefined,
  });
}

function initRevealObserver() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  for (const [index, node] of revealNodes.entries()) {
    node.style.setProperty("--reveal-delay", `${(index % 4) * 55}ms`);
  }

  if (!revealNodes.length || prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    for (const node of revealNodes) node.classList.add("is-visible");
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  for (const node of revealNodes) {
    if (!node.classList.contains("is-visible")) revealObserver.observe(node);
  }
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function updateLiveStatus() {
  if (uptimeNode) {
    uptimeNode.textContent = formatDuration(Date.now() - launchedAt);
  }

  if (nowNode) {
    nowNode.textContent = `${new Date().toISOString().slice(0, 19).replace("T", " ")}Z`;
  }
}

function setMatrixFilter(filter) {
  for (const button of filterButtons) {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  for (const row of matrixRows) {
    const domains = (row.dataset.domain || "").split(/\s+/);
    const filtered = filter !== "all" && !domains.includes(filter);
    row.classList.toggle("is-filtered", filtered);
    row.setAttribute("aria-hidden", String(filtered));
  }
}

function setStatus(message, type = "") {
  if (!statusNode) return;

  statusNode.textContent = message;
  statusNode.className = "form-status";

  if (type) {
    statusNode.classList.add(`is-${type}`);
  }
}

for (const link of scrollLinks) {
  link.addEventListener("click", handleHashLinkClick);
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    setMatrixFilter(button.dataset.filter || "all");
  });
}

if (statusNode) {
  statusNode.setAttribute("aria-atomic", "true");
}

if (form) {
  form.addEventListener("input", () => {
    if (statusNode?.textContent) {
      setStatus("");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("Please complete the required fields before sending.", "error");
      return;
    }

    if (submitButton?.disabled) return;

    form.setAttribute("aria-busy", "true");

    if (submitButton) {
      submitButton.disabled = true;
    }

    setStatus("Sending your inquiry securely...");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to send inquiry.");
      }

      form.reset();

      if (window.turnstile) {
        window.turnstile.reset();
      }

      setStatus("Message sent. We will get back to you shortly.", "success");
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      form.removeAttribute("aria-busy");

      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

window.addEventListener("scroll", requestPageStateUpdate, { passive: true });
window.addEventListener("resize", requestPageStateUpdate);
window.addEventListener("hashchange", () => {
  if (!window.location.hash) return;
  scrollToHash(window.location.hash, {
    updateHistory: false,
    focus: false,
    behavior: prefersReducedMotion.matches ? "auto" : "smooth",
  });
});

const motionChangeHandler = () => {
  initRevealObserver();
  requestPageStateUpdate();
};

if (typeof prefersReducedMotion.addEventListener === "function") {
  prefersReducedMotion.addEventListener("change", motionChangeHandler);
} else if (typeof prefersReducedMotion.addListener === "function") {
  prefersReducedMotion.addListener(motionChangeHandler);
}

initRevealObserver();
setMatrixFilter("all");
updateLiveStatus();
window.setInterval(updateLiveStatus, 1000);
requestPageStateUpdate();
window.clearTimeout(window.__revealFallbackTimer);

if (window.location.hash) {
  window.requestAnimationFrame(() => {
    scrollToHash(window.location.hash, {
      updateHistory: false,
      focus: false,
      behavior: "auto",
    });
  });
}
