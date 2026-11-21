const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const BIN = path.join(ROOT, 'quizmaster');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.ico':'image/x-icon' };

function runC(args) {
  try {
    const raw = execFileSync(BIN, args, { cwd: ROOT, encoding: 'utf8', timeout: 5000 });
    return JSON.parse(raw);
  } catch (err) {
    return { error: 'The C engine could not complete this request. Check that it is compiled and data files are present.' };
  }
}
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':'*' });
  res.end(JSON.stringify(data));
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/questions') {
    const category = url.searchParams.get('category') || 'All';
    return send(res, 200, runC(['questions', category]));
  }
  if (req.method === 'GET' && url.pathname === '/api/leaderboard') return send(res, 200, runC(['leaderboard']));
  if (req.method === 'POST' && url.pathname === '/api/finish') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 12000) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const name = String(data.name || '').trim().replace(/[|\r\n]/g, ' ').slice(0, 32);
        const category = String(data.category || 'All').replace(/[|\r\n]/g, ' ').slice(0, 32);
        const answers = String(data.answers || '').replace(/[^0-9:A-Da-d,]/g, '').slice(0, 4000);
        if (!name || !answers) return send(res, 400, { error:'Please enter a player name and complete the quiz.' });
        return send(res, 200, runC(['finish', name, category, answers]));
      } catch { return send(res, 400, { error:'Invalid request.' }); }
    });
    return;
  }
  const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(PUBLIC, requested);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error:'Forbidden' });
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type':MIME[path.extname(file)] || 'application/octet-stream' }); res.end(content);
  });
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`QuizMaster is running at http://localhost:${port}`));
