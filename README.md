# AegisOps Technologies website

Static site (`site/`) plus one Cloudflare Pages Function (`functions/api/contact.js`) that sends contact-form enquiries through Resend. Concept and messaging live in [docs/AegisOps-Concept.md](docs/AegisOps-Concept.md).

```
site/                  static files served by Cloudflare Pages
functions/api/         Pages Functions (POST /api/contact)
wrangler.toml          Pages config (output dir = site)
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard, Workers & Pages, Create, Pages, Connect to Git.
3. Build settings: framework preset **None**, build command **(empty)**, build output directory **`site`**.
4. Settings, Variables and Secrets (Production, and Preview if wanted):
   - `RESEND_API_KEY`: type **Secret**, your Resend sending key
   - `CONTACT_TO`: the inbox that should receive enquiries
   - `CONTACT_FROM` (optional): defaults to `AegisOps Website <no-reply@aegisopstech.me>`
5. Add your custom domain under Custom domains.

## Local development

Create `.dev.vars` (git-ignored):

```
RESEND_API_KEY=re_xxxxxxxx
CONTACT_TO=you@example.com
```

```bash
npx wrangler pages dev
```

Open http://localhost:8788.

## Notes

- The sender domain must stay verified in Resend (`aegisopstech.me`).
- The form has a honeypot field and server-side validation. Add Cloudflare Turnstile or a WAF rate-limit rule if spam appears.
