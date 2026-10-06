// Local stand-in for PostHog during `swell app dev` integration runs.
// GET /requests lists what arrived, DELETE /requests clears it.
// REJECT_STATUS=401 makes the capture endpoint reject events.
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 4318);
const rejectStatus = Number(process.env.REJECT_STATUS || 0);
const requests = [];

createServer((req, res) => {
  if (req.url === '/requests' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(requests, null, 2));
    return;
  }
  if (req.url === '/requests' && req.method === 'DELETE') {
    requests.length = 0;
    res.writeHead(204);
    res.end();
    return;
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
    requests.push({ method: req.method, url: req.url, body });
    console.log(req.method, req.url, body?.event ?? '');

    const status = rejectStatus && req.url.startsWith('/i/v0/e') ? rejectStatus : 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(status === 200 ? '{"status":1}' : '{"error":"rejected by mock"}');
  });
}).listen(port, () => console.log(`Mock PostHog on http://localhost:${port}`));
