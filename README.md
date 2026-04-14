# Sentry0 One-Pager

Static marketing site for `sentry0.com` with:

- Cloudflare Worker hosting with static assets
- Cloudflare Turnstile protected contact form
- Worker route handler in `worker.js`
- Email delivery through Resend to `hello@sentry0.ai` and the inquiring user

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

The Turnstile site key is already embedded in `public/index.html`.

## Resend email delivery

This Worker now uses Resend so it can:

1. Send the inquiry to `hello@sentry0.ai`
2. Send a confirmation copy to the email address entered in the form

Before this works in production, make sure:

1. `sentry0.ai` is verified in Resend.
2. `RESEND_API_KEY` is set as a secret in the Worker environment.
3. The sender address `hello@sentry0.ai` is allowed by your verified Resend domain.

## Email delivery note

Cloudflare Workers verify Turnstile and then call the Resend API for transactional email delivery.
