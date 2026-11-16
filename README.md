# Parts Portal

## Deploy on Vercel
1. Unzip, then push the folder to a GitHub repo (or run `npx vercel` in the folder).
2. In Vercel: Project Settings > Environment Variables, add
   PORTAL_USER and PORTAL_PASS (your login). Redeploy.
3. Open your Vercel URL and log in.
Framework preset: "Other". No build command needed.

## Run locally
    npm install
    PORTAL_USER=you PORTAL_PASS=strongpass npm start
Open http://localhost:3000

## Daily use
1. Type chassis number, press "Find parts" (PartSouq loads inside the portal).
2. Select the part number text on the page, press "Use text selected in the page".
3. "Check price on Boodmo" opens Boodmo inside the portal. "Check my stock" reads stock.csv.

## Updating
- Stock: replace stock.csv (part_number,name,qty,price,location), then redeploy.
- Site URL patterns: config.js (urls).
- Broken links/scripts after a site change: rewrite rules in app.js (mountSite).

## Limits on Vercel
- Responses larger than ~4.5 MB and requests slower than 30 s fail.
- Vercel servers share cloud IP ranges that bot protection often blocks. If a site
  shows a bot-check page, run the portal on a small VPS instead (use `npm start`).
- Keep the portal private; do not share the login.
