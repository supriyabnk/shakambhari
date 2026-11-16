// ---- EDIT THIS FILE when a site changes its layout or URLs ----
module.exports = {
  port: process.env.PORT || 3000,
  // Login for your portal (set real values via environment variables)
  user: process.env.PORTAL_USER || 'admin',
  pass: process.env.PORTAL_PASS || 'change-me',

  sites: {
    ps: { target: 'https://partsouq.com' },   // mounted at /ps
    bm: { target: 'https://boodmo.com' }      // mounted at /bm
  },

  // Where the portal sends you. {q} is replaced by what you type.
  // Verify these once by searching on each site and copying the URL pattern.
  urls: {
    chassis: '/ps/en/search/all?q={q}',
    boodmoPart: '/bm/search/?q={q}'
  },

  stockFile: 'stock.csv'
};
