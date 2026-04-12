import { EmailMessage } from "cloudflare:email";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char] || char;
  });

const verifyTurnstile = async (token, secret, ip) => {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: ip || "",
    }),
  });

  return response.json();
};

const buildRawEmail = ({ from, to, replyTo, subject, text }) =>
  [
    `From: Sentry0 <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
  ]
    .filter(Boolean)
    .join("\r\n");

const sendWithCloudflareEmail = async ({ binding, from, to, replyTo, subject, text }) => {
  const raw = buildRawEmail({ from, to, replyTo, subject, text });
  const message = new EmailMessage(from, to, raw);
  await binding.send(message);
};

const handleContact = async (request, env) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Invalid content type." }, 415);
    }

    const payload = await request.json();
    const {
      name = "",
      email = "",
      company = "",
      service = "",
      message = "",
      ["cf-turnstile-response"]: turnstileToken = "",
    } = payload;

    if (!name || !email || !service || !message) {
      return json({ error: "Please complete all required fields." }, 400);
    }

    if (!turnstileToken) {
      return json({ error: "Please complete the CAPTCHA challenge." }, 400);
    }

    if (!env.TURNSTILE_SECRET_KEY) {
      return json({ error: "Turnstile secret is not configured." }, 500);
    }

    const verification = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP")
    );

    if (!verification.success) {
      return json({ error: "Turnstile verification failed." }, 400);
    }

    if (!env.SEND_EMAIL) {
      return json({ error: "Cloudflare Email Service is not configured." }, 500);
    }

    // Cloudflare's send_email binding is intended for addresses verified through
    // Email Routing. We therefore deliver the website inquiry to our mailbox here.
    // Sending an automatic copy to an arbitrary website visitor is not reliable
    // with this binding alone and typically requires a transactional email provider.
    const fromAddress = "hello@sentry0.ai";
    const recipientAddress = "hello@sentry0.ai";
    const subject = `[Sentry0] ${service} inquiry from ${name}`;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeService = escapeHtml(service);
    const safeCompany = escapeHtml(company || "Not provided");
    const safeMessage = escapeHtml(message);

    await sendWithCloudflareEmail({
      binding: env.SEND_EMAIL,
      from: fromAddress,
      to: recipientAddress,
      replyTo: email,
      subject,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company || "Not provided"}`,
        `Service: ${service}`,
        "",
        "Message:",
        message,
        "",
        "Safe summary:",
        `Name: ${safeName}`,
        `Email: ${safeEmail}`,
        `Company: ${safeCompany}`,
        `Service: ${safeService}`,
        "",
        safeMessage,
      ].join("\n"),
    });

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || "Unexpected server error." }, 500);
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
