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

## Login

Access is gated behind Supabase Auth, email magic-link only (no passwords):

- `public/js/supabase-config.js` — the project URL and anon/public key (safe to expose client-side;
  Row Level Security, not this key, is what protects data — there's currently no app data in the
  database, just `auth.users`).
- `public/js/auth.js` — loads `@supabase/supabase-js` from the `esm.sh` CDN (no bundler needed),
  renders the "sign in" form, sends the magic link via `signInWithOtp`, and shows/hides the rest of
  the app (`#appGate`) based on session state.

**One-time setup required in the Supabase dashboard** (no API for this, must be done by hand):

1. Go to **Authentication → URL Configuration** for project `ljdfnratexltcxtcgdto`.
2. Set **Site URL** to your deployed Netlify URL (e.g. `https://your-site.netlify.app`).
3. Add the same URL, plus `http://localhost:8888`, to **Redirect URLs** (for `netlify dev`).
4. Until step 2–3 are done, magic links will try to redirect to Supabase's default
   (`localhost:3000`) and fail in production.

The built-in Supabase email sender works out of the box but is rate-limited (a handful of emails/
hour) — fine for personal use/testing. For real traffic, add your own SMTP under
**Project Settings → Auth → SMTP Settings**.

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
4. Deploy, then do the Supabase dashboard setup under **Login** above so magic links redirect
   to your live URL.
5. Open the site, sign in with an email magic link, paste a Suno API key (from
   [sunoapi.org/api-key](https://sunoapi.org/api-key)), click **Save**, and generate.

No environment variables are required — each visitor supplies their own Suno key, and the
Supabase anon key is safe to ship in client code.
