# Sentry0 One-Pager

Static marketing site for `sentry0.com` with:

- Cloudflare Worker hosting with static assets
- Cloudflare Turnstile protected contact form
- Worker route handler in `worker.js`
- Email delivery through Cloudflare Email Service to `hello@sentry0.ai`

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

The Turnstile site key is already embedded in `public/index.html`.

## Cloudflare Email Service

This Worker now uses a `send_email` binding named `SEND_EMAIL` and is configured to deliver contact form emails to `hello@sentry0.ai`.

Before this works in production, make sure:

1. Email Routing is enabled in Cloudflare for the domain.
2. `hello@sentry0.ai` is configured correctly in your email setup.
3. The Worker has the Email Service binding connected.

## Important limitation

Cloudflare Email Service is suitable for sending to addresses verified and allowed through your Cloudflare Email Routing setup. If you want to send automatic confirmation emails to arbitrary website visitors, you will usually still need a dedicated transactional email provider.

## Email delivery note

Cloudflare Workers can verify Turnstile directly and can send email using Cloudflare Email Service. Cloudflare Email Routing is best suited for delivery to addresses configured and allowed in your Cloudflare email setup.
