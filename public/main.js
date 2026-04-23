const form = document.querySelector("#contact-form");
const statusNode = document.querySelector("#form-status");
const submitButton = form?.querySelector("button[type='submit']");
const revealNodes = Array.from(document.querySelectorAll(".reveal"));
const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
const navLocationLinks = navLinks.filter((link) => !link.classList.contains("nav-cta"));
const scrollLinks = Array.from(document.querySelectorAll("a[href^='#']:not([href='#'])"));
const brandLink = document.querySelector(".brand[href^='#']");
const topbarShell = document.querySelector(".topbar-shell");
const teamSection = document.querySelector(".team");
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const trackedNavLinks = [brandLink, ...navLocationLinks].filter(Boolean);
const HEADER_PROGRESS_RANGE = 84;
const HEADER_SCROLLED_Y = 12;

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

let revealObserver;
let teamObserver;
let scrollTicking = false;
let focusTimeoutId = 0;
let pendingTrackedHash = "";
let pendingTrackedTop = 0;

function getTargetFromHash(hash) {
  if (!hash || hash === "#") return null;

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getHeaderOffset() {
  const headerHeight = topbarShell ? topbarShell.getBoundingClientRect().height : 0;
  return Math.ceil(headerHeight + 18);
}

function syncHeaderOffset() {
  root.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
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

function getScrollAnchor(target) {
  if (target.matches("main")) {
    return target;
  }

  return target.querySelector("[data-scroll-anchor], h1, h2, h3") || target;
}

function getMaxScrollTop() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function withTemporaryHeaderState(scrolled, measure) {
  if (!topbarShell) {
    return measure();
  }

  const nextState = scrolled ? "true" : "false";
  const previousState = topbarShell.dataset.scrolled;
  const previousProgress = topbarShell.style.getPropertyValue("--header-progress");
  const nextProgress = scrolled ? "1" : "0";

  if (previousState === nextState && previousProgress === nextProgress) {
    return measure();
  }

  topbarShell.dataset.scrolled = nextState;
  topbarShell.style.setProperty("--header-progress", nextProgress);

  try {
    return measure();
  } finally {
    if (previousProgress) {
      topbarShell.style.setProperty("--header-progress", previousProgress);
    } else {
      topbarShell.style.removeProperty("--header-progress");
    }

    if (previousState) {
      topbarShell.dataset.scrolled = previousState;
    } else {
      delete topbarShell.dataset.scrolled;
    }
  }
}

function getTargetScrollTop(target) {
  const anchor = getScrollAnchor(target);
  const measureScrollTop = (scrolled) =>
    withTemporaryHeaderState(scrolled, () =>
      clamp(getDocumentTop(anchor) - getHeaderOffset(), 0, getMaxScrollTop())
    );

  const scrolledTop = measureScrollTop(true);
  return scrolledTop > HEADER_SCROLLED_Y ? scrolledTop : measureScrollTop(false);
}

function setCurrentNav(hash) {
  for (const link of trackedNavLinks) {
    if (link.getAttribute("href") === hash) {
      link.setAttribute("aria-current", "location");
      continue;
    }

    link.removeAttribute("aria-current");
  }
}

function clearPendingTrackedNav() {
  pendingTrackedHash = "";
  pendingTrackedTop = 0;
}

function getFocusTarget(target) {
  if (target.matches("main, h1, h2, h3")) {
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    return target;
  }

  const heading = target.querySelector("h1, h2, h3");
  const focusTarget = heading || target;

  if (!focusTarget.hasAttribute("tabindex")) {
    focusTarget.setAttribute("tabindex", "-1");
  }

  return focusTarget;
}

function focusTarget(target) {
  window.clearTimeout(focusTimeoutId);

  const destination = getFocusTarget(target);
  const delay = prefersReducedMotion.matches ? 0 : 160;

  focusTimeoutId = window.setTimeout(() => {
    destination.focus({ preventScroll: true });
  }, delay);
}

function updateCurrentNav() {
  if (!linkedTargets.length) return;

  if (pendingTrackedHash) {
    if (Math.round(window.scrollY) !== Math.round(pendingTrackedTop)) {
      setCurrentNav(pendingTrackedHash);
      return;
    }

    clearPendingTrackedNav();
  }

  if (Math.ceil(window.scrollY) >= Math.floor(getMaxScrollTop())) {
    setCurrentNav(linkedTargets[linkedTargets.length - 1].hash);
    return;
  }

  const probe = Math.ceil(window.scrollY + getHeaderOffset());
  let currentHash = linkedTargets[0].hash;

  for (const { hash, target } of linkedTargets) {
    const anchorTop = Math.floor(getDocumentTop(getScrollAnchor(target)));

    if (probe >= anchorTop) {
      currentHash = hash;
    }
  }

  setCurrentNav(currentHash);
}

function updateHeaderState() {
  if (!topbarShell) return;

  const progress = clamp(window.scrollY / HEADER_PROGRESS_RANGE, 0, 1);
  topbarShell.dataset.scrolled =
    progress > HEADER_SCROLLED_Y / HEADER_PROGRESS_RANGE ? "true" : "false";
  topbarShell.style.setProperty("--header-progress", progress.toFixed(3));
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

function scrollToHash(hash, { updateHistory = false, focus = true, behavior } = {}) {
  const target = getTargetFromHash(hash);
  if (!target) return;

  syncHeaderOffset();

  if (updateHistory && window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }

  const finalBehavior = behavior || (prefersReducedMotion.matches ? "auto" : "smooth");
  const nextTop = getTargetScrollTop(target);

  if (linkedTargets.some((entry) => entry.hash === hash)) {
    pendingTrackedHash = hash;
    pendingTrackedTop = nextTop;
    setCurrentNav(hash);
  } else {
    clearPendingTrackedNav();
  }

  window.scrollTo({
    top: nextTop,
    behavior: finalBehavior,
  });

  if (focus) {
    focusTarget(target);
  }

  if (Math.round(window.scrollY) === Math.round(nextTop) || finalBehavior === "auto") {
    clearPendingTrackedNav();
    requestPageStateUpdate();
  }
}

function handleManualScrollIntent(event) {
  if (!pendingTrackedHash) return;

  if (
    event.type === "keydown" &&
    ![" ", "ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp"].includes(event.key)
  ) {
    return;
  }

  clearPendingTrackedNav();
}

function initRevealObserver() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  for (const [index, node] of revealNodes.entries()) {
    node.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
  }

  if (!revealNodes.length || prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    for (const node of revealNodes) {
      node.classList.add("is-visible");
    }
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
      rootMargin: "0px 0px -12% 0px",
    }
  );

  for (const node of revealNodes) {
    if (node.classList.contains("is-visible")) continue;
    revealObserver.observe(node);
  }
}

function initTeamObserver() {
  if (teamObserver) {
    teamObserver.disconnect();
    teamObserver = null;
  }

  if (!teamSection) return;

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    teamSection.dataset.inview = "true";
    return;
  }

  teamSection.dataset.inview = "false";
  teamObserver = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      teamSection.dataset.inview = entry?.isIntersecting ? "true" : "false";
    },
    {
      threshold: 0.35,
      rootMargin: "0px 0px -18% 0px",
    }
  );

  teamObserver.observe(teamSection);
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
  const target = getTargetFromHash(hash);
  if (!target) return;

  event.preventDefault();

  scrollToHash(hash, {
    updateHistory: true,
    focus: true,
    behavior: link.dataset.scrollBehavior === "instant" ? "auto" : undefined,
  });
}

for (const link of scrollLinks) {
  link.addEventListener("click", handleHashLinkClick);
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
window.addEventListener("wheel", handleManualScrollIntent, { passive: true });
window.addEventListener("touchstart", handleManualScrollIntent, { passive: true });
window.addEventListener("keydown", handleManualScrollIntent);
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
  initTeamObserver();
  requestPageStateUpdate();
};

if (typeof prefersReducedMotion.addEventListener === "function") {
  prefersReducedMotion.addEventListener("change", motionChangeHandler);
} else if (typeof prefersReducedMotion.addListener === "function") {
  prefersReducedMotion.addListener(motionChangeHandler);
}

initRevealObserver();
initTeamObserver();
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
