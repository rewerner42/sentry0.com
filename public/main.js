const form = document.querySelector("#contact-form");
const statusNode = document.querySelector("#form-status");
const submitButton = form?.querySelector("button[type='submit']");
const revealNodes = Array.from(document.querySelectorAll(".reveal"));
const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
const scrollLinks = Array.from(document.querySelectorAll("a[href^='#']:not([href='#'])"));
const brandLink = document.querySelector(".brand[href^='#']");
const topbarShell = document.querySelector(".topbar-shell");
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const linkedTargets = Array.from(
  new Set(
    [brandLink, ...navLinks]
      .map((link) => getTargetFromHash(link?.getAttribute("href")))
      .filter(Boolean)
  )
);

let revealObserver;
let scrollTicking = false;
let focusTimeoutId = 0;

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

function getHeaderOffset() {
  const headerHeight = topbarShell ? topbarShell.getBoundingClientRect().height : 0;
  return Math.ceil(headerHeight + 18);
}

function syncHeaderOffset() {
  root.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
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

  const offset = getHeaderOffset() + 28;
  let currentHash = `#${linkedTargets[0].id}`;

  for (const target of linkedTargets) {
    if (target.getBoundingClientRect().top <= offset) {
      currentHash = `#${target.id}`;
    }
  }

  for (const link of [brandLink, ...navLinks].filter(Boolean)) {
    if (link.getAttribute("href") === currentHash) {
      link.setAttribute("aria-current", "location");
      continue;
    }

    link.removeAttribute("aria-current");
  }
}

function updateHeaderState() {
  if (!topbarShell) return;

  topbarShell.dataset.scrolled = window.scrollY > 12 ? "true" : "false";
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

  target.scrollIntoView({
    block: "start",
    behavior: behavior || (prefersReducedMotion.matches ? "auto" : "smooth"),
  });

  if (focus) {
    focusTarget(target);
  }

  updateCurrentNav();
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
requestPageStateUpdate();

if (window.location.hash) {
  window.requestAnimationFrame(() => {
    scrollToHash(window.location.hash, {
      updateHistory: false,
      focus: false,
      behavior: "auto",
    });
  });
}
