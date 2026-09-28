# Sunoforge

A one-page AI music generator built on the [Suno API](https://docs.sunoapi.org). Users paste
their own Suno API key in the browser; a small Netlify Function forwards requests to
`api.sunoapi.org` so the browser never has to talk cross-origin to a third party.

## How it works

- `public/` — the static one-pager (HTML/CSS/vanilla JS). No build step, no framework.
- `netlify/functions/` — three thin serverless proxies:
  - `generate.js` — `POST /api/v1/generate` (starts a music generation task)
  - `status.js` — `GET /api/v1/generate/record-info` (polled every 5s until the track is ready)
  - `credits.js` — `GET /api/v1/generate/credit` (balance check)

The API key is entered by the user, stored only in `localStorage` in their own browser, and sent
per-request to these functions (never hard-coded or stored server-side). The functions attach it
as the `Authorization: Bearer` header when calling Suno.

Generation uses polling (`record-info`) instead of Suno's webhook callback, since a static
Netlify site has no reliable place to receive a webhook. The `callBackUrl` field the API requires
is filled with a harmless placeholder.

## Local development

```bash
npm install -g netlify-cli   # if you don't have it
netlify dev
```

This serves `public/` and runs the functions locally at `http://localhost:8888`.

## Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick this repo.
3. Build settings are already defined in `netlify.toml`:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
   - No build command needed.
4. Deploy. Open the site, paste a Suno API key (from
   [sunoapi.org/api-key](https://sunoapi.org/api-key)), click **Save**, and generate.

No environment variables are required — each visitor supplies their own key.
