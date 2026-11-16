const express = require('express');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const cfg = require('./config');

const app = express();

// ---- Login (HTTP Basic). Keep this portal private. ----
app.use((req, res, next) => {
  if (process.env.VERCEL && !process.env.PORTAL_PASS) {
    return res.status(500).send('Set PORTAL_USER and PORTAL_PASS in Vercel project settings, then redeploy.');
  }
  const [u, p] = Buffer.from((req.headers.authorization || '').split(' ')[1] || '', 'base64')
    .toString().split(':');
  if (u === cfg.user && p === cfg.pass) return next();
  res.set('WWW-Authenticate', 'Basic realm="Parts Portal"').status(401).send('Login required');
});

// ---- Proxy a site under /<prefix> and rewrite its links ----
function mountSite(prefix, target) {
  const host = new URL(target).host.replace(/^www\./, '');
  const abs = new RegExp(`(https?:)?//(www\\.)?${host.replace(/\./g, '\\.')}`, 'g');

  app.use(`/${prefix}`, createProxyMiddleware({
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    pathRewrite: { [`^/${prefix}`]: '' },
    cookieDomainRewrite: '',
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('accept-encoding', 'identity');
        proxyReq.setHeader('referer', target + '/');
        proxyReq.removeHeader('authorization'); // never send portal login upstream
      },
      proxyRes: responseInterceptor(async (buf, proxyRes, req, res) => {
        res.removeHeader('x-frame-options');
        res.removeHeader('content-security-policy');
        res.removeHeader('content-security-policy-report-only');

        const loc = proxyRes.headers.location;
        if (loc) res.setHeader('location', loc.replace(abs, `/${prefix}`));

        const type = proxyRes.headers['content-type'] || '';
        if (!/text\/html|javascript|json|css/.test(type)) return buf;

        let body = buf.toString('utf8');
        body = body.replace(abs, `/${prefix}`);
        if (type.includes('text/html')) {
          body = body.replace(/(href|src|action)=(["'])\/(?!\/|ps\/|bm\/)/g, `$1=$2/${prefix}/`);
        }
        return body;
      }),
      error: (err, req, res) => res.writeHead && res.writeHead(502).end('Site unreachable: ' + err.message)
    }
  }));
}
for (const [prefix, s] of Object.entries(cfg.sites)) mountSite(prefix, s.target);

// ---- Stock lookup from stock.csv (part_number,name,qty,price,location) ----
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
app.get('/api/stock', (req, res) => {
  const q = norm(req.query.part);
  if (!q) return res.json({ found: false, items: [] });
  let rows = [];
  try {
    rows = fs.readFileSync(path.join(__dirname, cfg.stockFile), 'utf8').trim().split(/\r?\n/).slice(1);
  } catch (e) { return res.status(500).json({ error: 'Cannot read ' + cfg.stockFile }); }
  const items = rows.map(r => r.split(',')).filter(c => norm(c[0]) === q)
    .map(([part_number, name, qty, price, location]) => ({ part_number, name, qty: Number(qty), price, location }));
  res.json({ found: items.length > 0, items });
});

// ---- Diagnostics: /api/debug?site=ps&path=/ shows what the other site returns to your server ----
app.get('/api/debug', async (req, res) => {
  const s = cfg.sites[req.query.site];
  if (!s) return res.status(400).json({ error: 'site must be one of: ' + Object.keys(cfg.sites).join(', ') });
  const url = s.target + (req.query.path || '/');
  try {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html' } });
    const text = await r.text();
    res.json({
      requested: url, status: r.status,
      location: r.headers.get('location'),
      server: r.headers.get('server'),
      contentType: r.headers.get('content-type'),
      blockedByBotCheck: /cloudflare|captcha|just a moment|access denied/i.test(text),
      bodyStart: text.slice(0, 400)
    });
  } catch (e) { res.status(502).json({ requested: url, error: e.message }); }
});

app.get('/api/config', (req, res) => res.json(cfg.urls));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));

module.exports = app;
