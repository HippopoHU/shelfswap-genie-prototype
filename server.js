import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4174);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.json': 'application/json; charset=utf-8' };

function project(products) {
  const before = products.reduce((sum, p) => sum + p.baseRevenue, 0);
  const rows = products.map((p) => {
    const visibility = 1 + (products.length - 1 - p.slot) * 0.035;
    const adjacency = p.category === 'snacks' && p.slot <= 1 ? 1.04 : 1;
    return { ...p, simulatedRevenue: Math.round(p.baseRevenue * visibility * adjacency) };
  });
  const after = rows.reduce((sum, p) => sum + p.simulatedRevenue, 0);
  const revenueDelta = after - before;
  return { before, after, revenueDelta, marginDelta: Math.round(revenueDelta * .31), unitsDelta: Math.round(revenueDelta / 3.7), products: rows };
}

function explain(result, prefix = '') {
  const winner = result.products.reduce((best, p) => p.simulatedRevenue - p.baseRevenue > best.simulatedRevenue - best.baseRevenue ? p : best, result.products[0]);
  return `${prefix}${winner.name} gains visibility in slot ${winner.slot + 1}, nearer the customer sightline. The model estimates ${Math.round((winner.simulatedRevenue / winner.baseRevenue - 1) * 100)}% lift for that item; snack adjacency is weighted as a secondary demand signal.`;
}

export function simulateSwap({ products, leftId, rightId }) {
  const left = products.find((p) => p.id === leftId);
  const right = products.find((p) => p.id === rightId);
  if (!left || !right || left.id === right.id) throw new Error('Choose two different products on the shelf.');
  const swapped = products.map((p) => ({ ...p }));
  const a = swapped.find((p) => p.id === leftId);
  const b = swapped.find((p) => p.id === rightId);
  [a.slot, b.slot] = [b.slot, a.slot];
  const result = project(swapped);
  return { ...result, explanation: explain(result) };
}

export function optimizeShelf({ products }) {
  if (!Array.isArray(products) || products.length < 2 || products.length > 8) throw new Error('Optimization needs 2–8 products.');
  let best = null;
  const arrange = (remaining, placed) => {
    if (!remaining.length) {
      const candidate = project(placed.map((p, slot) => ({ ...p, slot })));
      if (!best || candidate.after > best.after) best = candidate;
      return;
    }
    remaining.forEach((item, index) => arrange(remaining.filter((_, i) => i !== index), [...placed, item]));
  };
  arrange(products, []);
  return { ...best, explanation: explain(best, 'Whole-shelf optimization complete. ') };
}

async function serveFile(req, res) {
  const pathname = req.url.split('?')[0];
  const raw = pathname === '/' ? '/index.html' : pathname;
  const relative = normalize(raw).replace(/^[/\\]+/, '');
  const file = join(root, 'public', relative);
  if (!file.startsWith(join(root, 'public'))) throw new Error('Invalid path');
  const info = await stat(file);
  if (info.isDirectory()) throw new Error('Not found');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/simulate') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const result = simulateSwap(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(result));
    }
    if (req.method === 'POST' && req.url === '/api/optimize') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const result = optimizeShelf(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(result));
    }
    if (req.method === 'GET') return await serveFile(req, res);
    res.writeHead(405).end();
  } catch (error) {
    res.writeHead(error instanceof SyntaxError || error.message.includes('Choose') ? 400 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

if (process.env.NODE_ENV !== 'test') server.listen(port, () => console.log(`ShelfSwap Genie listening on http://localhost:${port}`));
export { server };
