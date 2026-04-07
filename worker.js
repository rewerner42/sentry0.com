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

const sendWithResend = async ({ apiKey, from, to, replyTo, subject, html, text }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${errorText}`);
  }
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

    if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
      return json({ error: "Email delivery is not fully configured." }, 500);
    }

    const subject = `[Sentry0] ${service} inquiry from ${name}`;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeService = escapeHtml(service);
    const safeCompany = escapeHtml(company || "Not provided");
    const safeMessage = escapeHtml(message);

    await sendWithResend({
      apiKey: env.RESEND_API_KEY,
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
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
      ].join("\n"),
      html: `
        <h2>New inquiry from sentry0.com</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Company:</strong> ${safeCompany}</p>
        <p><strong>Service:</strong> ${safeService}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
      `,
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
