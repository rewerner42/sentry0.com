# Sentry0 One-Pager

Static marketing site for `sentry0.com` with:

- Cloudflare Worker hosting with static assets
- Cloudflare Turnstile protected contact form
- Worker route handler in `worker.js`
- Email delivery through Resend to `info@sentry0.com`

## Local development

1. Install Node.js 20+.
2. Run `npm install` to create a local lockfile if you want one.
3. Start the project with `npm run dev`.

## Cloudflare Worker build settings

This repository is configured for Git-based Worker deployments using `wrangler deploy`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Path: `/`

This project serves static assets from `/public` and routes form submissions through `worker.js`.

## Required environment variables for Cloudflare

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`

Recommended values:

- `CONTACT_TO_EMAIL=info@sentry0.com`
- `CONTACT_FROM_EMAIL=website@sentry0.com`

You also need to replace `YOUR_TURNSTILE_SITE_KEY` in `index.html` with your real public Turnstile site key.

## Email delivery note

Cloudflare Workers can verify Turnstile directly, but they do not send transactional email on their own. This project uses the Resend API from the Worker, which is a common and reliable setup for Cloudflare-hosted forms.
