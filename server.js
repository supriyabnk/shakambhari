// Local run only: npm start
const app = require('./app');
const cfg = require('./config');
app.listen(cfg.port, () => console.log(`Parts Portal on http://localhost:${cfg.port}`));
