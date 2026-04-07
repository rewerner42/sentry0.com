const form = document.querySelector("#contact-form");
const statusNode = document.querySelector("#form-status");
const revealNodes = document.querySelectorAll(".reveal");

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
