const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

// Active rooms (Clean real-time store, 0 dummy data)
const activeRooms = {
  'SKATE-8821': {
    roomCode: 'SKATE-8821',
    childName: 'Anak Saya',
    age: 9,
    weightKg: 32,
    category: 'Sepatu Roda / Inline Skate',
    maxSafeSpeed: 30,
    created: Date.now(),
    lastTelemetry: null,
    history: [],
    pingRequested: false
  }
};

// SSE Client connections for parents: { roomCode: [res, res...] }
const sseClients = {};

// Helper: Get local network IP addresses
function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. GET /api/info
  if (pathname === '/api/info' && req.method === 'GET') {
    const ips = getLocalNetworkIPs();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: PORT,
      localIPs: ips,
      primaryHost: ips[0],
      activeRooms: Object.keys(activeRooms).map(k => ({
        roomCode: k,
        childName: activeRooms[k].childName,
        category: activeRooms[k].category,
        isLive: activeRooms[k].lastTelemetry ? (Date.now() - activeRooms[k].lastTelemetry.receivedAt < 10000) : false
      }))
    }));
    return;
  }

  // 2. POST /api/register-child
  if (pathname === '/api/register-child' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const roomCode = data.roomCode || `SKATE-${randomNum}`;

        activeRooms[roomCode] = {
          roomCode: roomCode,
          childName: data.childName || 'Anak Saya',
          age: parseInt(data.age) || 8,
          weightKg: parseFloat(data.weightKg) || 30,
          category: data.category || 'Inline Skate',
          maxSafeSpeed: parseFloat(data.maxSafeSpeed) || 28,
          created: Date.now(),
          lastTelemetry: null,
          history: [],
          pingRequested: false
        };

        const primaryIP = getLocalNetworkIPs()[0];
        const trackerUrl = `http://${primaryIP}:${PORT}/tracker.html?room=${roomCode}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          roomCode: roomCode,
          childName: activeRooms[roomCode].childName,
          trackerUrl: trackerUrl
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Format data tidak valid' }));
      }
    });
    return;
  }

  // 3. POST /api/telemetry - Child phone sends real GPS fix
  if (pathname === '/api/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const roomCode = data.roomCode;

        if (!roomCode || !activeRooms[roomCode]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Kode ruangan tidak ditemukan' }));
          return;
        }

        const room = activeRooms[roomCode];
        const telemetryRecord = {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
          speed: parseFloat(data.speed) || 0,
          heading: parseFloat(data.heading) || 0,
          altitude: parseFloat(data.altitude) || 0,
          accuracy: parseFloat(data.accuracy) || 5,
          battery: parseInt(data.battery) || 100,
          isSkating: !!data.isSkating,
          timestamp: data.timestamp || new Date().toLocaleTimeString('id-ID'),
          receivedAt: Date.now()
        };

        room.lastTelemetry = telemetryRecord;
        room.history.unshift(telemetryRecord);
        if (room.history.length > 300) room.history.pop();

        // Broadcast to SSE parent listeners
        if (sseClients[roomCode] && sseClients[roomCode].length > 0) {
          const payload = `data: ${JSON.stringify({
            roomCode,
            childName: room.childName,
            category: room.category,
            weightKg: room.weightKg,
            maxSafeSpeed: room.maxSafeSpeed,
            telemetry: telemetryRecord
          })}\n\n`;

          sseClients[roomCode].forEach(client => {
            client.write(payload);
          });
        }

        const shouldPing = room.pingRequested;
        room.pingRequested = false;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, shouldPing: shouldPing }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gagal memproses telemetri' }));
      }
    });
    return;
  }

  // 4. GET /api/telemetry/:roomCode
  if (pathname.startsWith('/api/telemetry/') && req.method === 'GET') {
    const roomCode = pathname.replace('/api/telemetry/', '');
    const room = activeRooms[roomCode];

    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ruangan tidak ditemukan' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      roomCode: room.roomCode,
      childName: room.childName,
      category: room.category,
      weightKg: room.weightKg,
      maxSafeSpeed: room.maxSafeSpeed,
      lastTelemetry: room.lastTelemetry,
      isLive: room.lastTelemetry ? (Date.now() - room.lastTelemetry.receivedAt < 10000) : false
    }));
    return;
  }

  // 5. GET /api/stream/:roomCode
  if (pathname.startsWith('/api/stream/') && req.method === 'GET') {
    const roomCode = pathname.replace('/api/stream/', '');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    if (!sseClients[roomCode]) {
      sseClients[roomCode] = [];
    }
    sseClients[roomCode].push(res);

    if (activeRooms[roomCode] && activeRooms[roomCode].lastTelemetry) {
      res.write(`data: ${JSON.stringify({
        roomCode,
        childName: activeRooms[roomCode].childName,
        category: activeRooms[roomCode].category,
        weightKg: activeRooms[roomCode].weightKg,
        maxSafeSpeed: activeRooms[roomCode].maxSafeSpeed,
        telemetry: activeRooms[roomCode].lastTelemetry
      })}\n\n`);
    }

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (sseClients[roomCode]) {
        sseClients[roomCode] = sseClients[roomCode].filter(c => c !== res);
      }
    });
    return;
  }

  // 6. POST /api/ping-child
  if (pathname === '/api/ping-child' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const roomCode = data.roomCode;
        if (roomCode && activeRooms[roomCode]) {
          activeRooms[roomCode].pingRequested = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sinyal panggil terkirim ke HP anak' }));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ruangan tidak ditemukan' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Format salah' }));
      }
    });
    return;
  }

  // Static File Serving
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalNetworkIPs();
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
  ips.forEach(ip => {
    console.log(`Network access: http://${ip}:${PORT}/`);
  });
});
