# Sentry0 One-Pager

Static marketing site for `sentry0.com` with:

- Cloudflare Worker hosting with static assets
- Cloudflare Turnstile protected contact form
- Worker route handler in `worker.js`
- Email delivery through Cloudflare Email Sending API to `hello@sentry0.ai` and the inquiring user

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
- `CF_ACCOUNT_ID`
- `CF_EMAIL_API_TOKEN`
- `CF_EMAIL_FROM`

The Turnstile site key is already embedded in `public/index.html`.

## Cloudflare Email Sending

This Worker now uses Cloudflare's Email Sending API so it can:

1. Send the inquiry to `hello@sentry0.ai`
2. Send a confirmation copy to the email address entered in the form

Before this works in production, make sure:

1. Email Sending is configured in Cloudflare for the sender domain you want to use.
2. `CF_ACCOUNT_ID` is set in the Worker environment.
3. `CF_EMAIL_API_TOKEN` is set as a secret in the Worker environment.
4. `CF_EMAIL_FROM` is set to a valid sender address such as `hello@sentry0.ai`.

## Important limitation

The previous `send_email` Worker binding approach is not suitable for sending automatic copies to arbitrary visitors. This project now uses the Cloudflare Email Sending API instead.

## Email delivery note

Cloudflare Workers can verify Turnstile directly and can send email using Cloudflare Email Service. Cloudflare Email Routing is best suited for delivery to addresses configured and allowed in your Cloudflare email setup.
