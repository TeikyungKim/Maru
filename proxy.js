/**
 * KIS API CORS 프록시 (웹 개발용)
 * 실서버: https://openapi.koreainvestment.com:9443
 * 모의투자: https://openapivts.koreainvestment.com:29443
 *
 * 사용: node proxy.js  (또는 npm run web:dev)
 */

const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({ secure: false, changeOrigin: true });

proxy.on('error', (err, req, res) => {
  console.error('[proxy error]', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: err.message }));
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,appkey,appsecret,tr_id,custtype',
};

const server = http.createServer((req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // /kis/real/** → 실서버, /kis/mock/** → 모의서버
  if (req.url.startsWith('/kis/mock/')) {
    req.url = req.url.replace('/kis/mock', '');
    proxy.web(req, res, { target: 'https://openapivts.koreainvestment.com:29443' });
  } else if (req.url.startsWith('/kis/')) {
    req.url = req.url.replace('/kis', '');
    proxy.web(req, res, { target: 'https://openapi.koreainvestment.com:9443' });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 8088;
server.listen(PORT, () => {
  console.log(`KIS proxy listening on http://localhost:${PORT}`);
  console.log('  /kis/**      → openapi.koreainvestment.com:9443');
  console.log('  /kis/mock/** → openapivts.koreainvestment.com:29443');
});
