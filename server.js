import express from 'express';
import cors from 'cors';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import {
  readFileSync, writeFile, existsSync, mkdirSync, createReadStream
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = join(__dirname, 'data.json');
const FOTOS_DIR  = join(__dirname, 'fotos');

// ── Detectar modo: nube o local ───────────────────────────────────────────────
const MODO_NUBE = !!(process.env.MONGODB_URI && process.env.CLOUDINARY_CLOUD_NAME);
console.log(`🔧 Modo: ${MODO_NUBE ? '☁️  NUBE (MongoDB + Cloudinary)' : '💾 LOCAL (data.json + disco)'}`);

// ── Cloudinary ────────────────────────────────────────────────────────────────
if (MODO_NUBE) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── MongoDB ───────────────────────────────────────────────────────────────────
let dbClient = null;
let storeCol = null;

async function conectarMongo() {
  if (!MODO_NUBE) return;
  dbClient = new MongoClient(process.env.MONGODB_URI);
  await dbClient.connect();
  const db = dbClient.db('dripbatch');
  storeCol = db.collection('store');
  // Crear documento inicial si no existe
  await storeCol.updateOne(
    { _id: 'main' },
    { $setOnInsert: { _id: 'main', paquetes: [], prendas: [], compradores: [] } },
    { upsert: true }
  );
  console.log('✅ MongoDB conectado');
}

// ── Helpers de datos ──────────────────────────────────────────────────────────
const defaultData = { paquetes: [], prendas: [], compradores: [] };

async function readData() {
  if (MODO_NUBE) {
    const doc = await storeCol.findOne({ _id: 'main' });
    if (!doc) return defaultData;
    const { _id, ...data } = doc;
    return data;
  }
  // Local
  try {
    if (!existsSync(DATA_FILE)) return defaultData;
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return defaultData;
  }
}

async function saveData(data) {
  // Nunca guardar base64
  const clean = {
    ...data,
    prendas: (data.prendas || []).map(p => {
      if (p.foto?.startsWith('data:')) {
        const { foto, ...resto } = p;
        return resto;
      }
      return p;
    }),
  };

  if (MODO_NUBE) {
    await storeCol.replaceOne({ _id: 'main' }, { _id: 'main', ...clean }, { upsert: true });
    return;
  }
  // Local
  return new Promise((resolve, reject) => {
    writeFile(DATA_FILE, JSON.stringify(clean, null, 2), 'utf-8', err => {
      if (err) reject(err); else resolve();
    });
  });
}

// ── Fotos: subir ──────────────────────────────────────────────────────────────
async function subirFoto(fotoId, base64) {
  if (MODO_NUBE) {
    const data64 = base64.includes(',') ? base64 : `data:image/jpeg;base64,${base64}`;
    const result = await cloudinary.uploader.upload(data64, {
      public_id: `dripbatch/${fotoId}`,
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  }
  // Local
  if (!existsSync(FOTOS_DIR)) mkdirSync(FOTOS_DIR, { recursive: true });
  const safeId = fotoId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const destino = join(FOTOS_DIR, `${safeId}.jpg`);
  const data64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(data64, 'base64');
  await new Promise((resolve, reject) => {
    writeFile(destino, buffer, err => err ? reject(err) : resolve());
  });
  return `/api/foto/${safeId}`;
}

// ── Migración local: base64 → archivos ───────────────────────────────────────
async function migrarFotosLocal() {
  if (MODO_NUBE) return; // En nube la migración es manual (migrate-to-cloud.js)
  if (!existsSync(FOTOS_DIR)) mkdirSync(FOTOS_DIR, { recursive: true });
  const data = await readData();
  let migradas = 0;
  for (const prenda of data.prendas || []) {
    if (prenda.foto?.startsWith('data:image')) {
      const fotoId = `prenda_${prenda.id}`;
      const destino = join(FOTOS_DIR, `${fotoId}.jpg`);
      if (!existsSync(destino)) {
        const base64 = prenda.foto.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        await new Promise((resolve, reject) => {
          writeFile(destino, buffer, err => err ? reject(err) : resolve());
        });
        migradas++;
      }
      prenda.foto = `/api/foto/${fotoId}`;
    }
  }
  if (migradas > 0) {
    await saveData(data);
    console.log(`✅ Migración local: ${migradas} foto(s) movida(s) a /fotos/`);
  }
}

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Servir frontend en producción (Render sirve el build de Vite)
import { resolve } from 'path';
const DIST = resolve(__dirname, 'dist');
if (existsSync(DIST)) {
  const { default: serveStatic } = await import('serve-static');
  app.use(serveStatic(DIST));
}

// ── GET /api/foto/:fotoId — compatibilidad local ──────────────────────────────
app.get('/api/foto/:fotoId', (req, res) => {
  if (MODO_NUBE) return res.status(404).json({ error: 'Fotos servidas desde Cloudinary' });
  const fotoId = req.params.fotoId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const archivo = join(FOTOS_DIR, `${fotoId}.jpg`);
  if (!existsSync(archivo)) return res.status(404).json({ error: 'Foto no encontrada' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  createReadStream(archivo).pipe(res);
});

// ── POST /api/foto — subir foto ───────────────────────────────────────────────
app.post('/api/foto', express.json({ limit: '3mb' }), async (req, res) => {
  try {
    const { fotoId, base64 } = req.body;
    if (!fotoId || !base64) return res.status(400).json({ error: 'fotoId y base64 requeridos' });
    const url = await subirFoto(fotoId, base64);
    res.json({ ok: true, url });
  } catch (err) {
    console.error('Error subiendo foto:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/data ─────────────────────────────────────────────────────────────
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/data ────────────────────────────────────────────────────────────
app.post('/api/data', async (req, res) => {
  try {
    await saveData(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback SPA
if (existsSync(DIST)) {
  app.get(/.*/, (_, res) => res.sendFile(resolve(DIST, 'index.html')));
}

// ── Arrancar ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function arrancar() {
  await conectarMongo();
  await migrarFotosLocal();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  });
}

arrancar().catch(err => {
  console.error('Error al arrancar:', err);
  process.exit(1);
});
