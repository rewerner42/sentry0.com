const form = document.querySelector("#contact-form");
const statusNode = document.querySelector("#form-status");
const revealNodes = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll(".nav a[href^='#']");
const topbarShell = document.querySelector(".topbar-shell");
const serviceTabs = document.querySelectorAll(".service-tab");
const servicePanels = document.querySelectorAll(".service-panel");

const setStatus = (message, type = "") => {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.className = "form-status";
  if (type) {
    statusNode.classList.add(`is-${type}`);
  }
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.18 }
);

for (const node of revealNodes) {
  revealObserver.observe(node);
}

const setActiveServiceTab = (targetId) => {
  for (const tab of serviceTabs) {
    const isActive = tab.dataset.tabTarget === targetId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  }

  for (const panel of servicePanels) {
    const isActive = panel.id === targetId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  }
};

for (const tab of serviceTabs) {
  tab.addEventListener("click", () => {
    setActiveServiceTab(tab.dataset.tabTarget);
  });
}

const getHeaderOffset = () => {
  const headerHeight = topbarShell ? topbarShell.getBoundingClientRect().height : 0;
  return headerHeight + 18;
};

for (const link of navLinks) {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();

    const targetTop = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();

    window.history.replaceState(null, "", href);
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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

      const result = await response.json();

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
    }
  });
}
