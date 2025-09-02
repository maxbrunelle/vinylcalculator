# Vinyl Remaining — Next.js + Tailwind

A polished vinyl roll remaining calculator with unit switching, thickness presets, light/dark themes, saved history, and CSV export.

## Local dev

```bash
npm i
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

1. Create a new GitHub repo and push this folder.
2. In Vercel, click **Add New → Project**, import the repo, keep defaults:
   - Framework: **Next.js**
   - Root directory: `/` (project root)
   - Build command: `next build`
   - Output directory: `.next`
3. Deploy.

### One‑click via CLI (optional)

```bash
npm i -g vercel
vercel
# follow prompts; subsequent deploys: vercel --prod
```

## Swapping your logo later

Set a logo URL (https or base64 data URL) in localStorage and reload:

```js
localStorage.setItem('vinylCalc.logoUrl', JSON.stringify('https://your.cdn.com/logo.png'));
location.reload();
```

(Or wire an upload control; the app already reads from `vinylCalc.logoUrl` automatically.)
