/**
 * migrate-to-cloud.js
 * ─────────────────────────────────────────────────────────────────
 * Corre UNA SOLA VEZ desde tu PC para migrar datos locales a la nube.
 *
 * Qué hace:
 *   1. Lee data.json local
 *   2. Sube cada foto de /fotos/ a Cloudinary
 *   3. Guarda todos los datos en MongoDB Atlas
 *
 * Uso:
 *   1. Copia .env.example → .env y rellena las credenciales
 *   2. node migrate-to-cloud.js
 */

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { readFileSync, existsSync, createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'data.json');
const FOTOS_DIR = join(__dirname, 'fotos');

// ── Validar env ───────────────────────────────────────────────────────────────
const required = ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Faltan variables de entorno: ${missing.join(', ')}`);
  console.error('   Copia .env.example → .env y rellena las credenciales');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Leer data.json ────────────────────────────────────────────────────────────
if (!existsSync(DATA_FILE)) {
  console.error('❌ No se encontró data.json');
  process.exit(1);
}
const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
console.log(`📦 Datos: ${data.paquetes?.length ?? 0} paquetes, ${data.prendas?.length ?? 0} prendas, ${data.compradores?.length ?? 0} compradores`);

// ── Subir fotos a Cloudinary ──────────────────────────────────────────────────
async function subirFoto(fotoId) {
  const archivo = join(FOTOS_DIR, `${fotoId}.jpg`);
  if (!existsSync(archivo)) {
    console.warn(`  ⚠️  Foto no encontrada localmente: ${fotoId}.jpg`);
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(archivo, {
      public_id: `dripbatch/${fotoId}`,
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    console.warn(`  ⚠️  Error subiendo ${fotoId}: ${err.message}`);
    return null;
  }
}

async function migrar() {
  console.log('\n📸 Migrando fotos a Cloudinary...');
  let subidas = 0;
  let noEncontradas = 0;

  for (const prenda of data.prendas || []) {
    if (!prenda.foto) continue;

    // Si ya es URL de Cloudinary, saltar
    if (prenda.foto.includes('cloudinary.com')) continue;

    // Extraer fotoId de /api/foto/<fotoId>
    const match = prenda.foto.match(/\/api\/foto\/(.+)/);
    if (!match) continue;

    const fotoId = match[1];
    process.stdout.write(`  Subiendo ${fotoId}... `);
    const url = await subirFoto(fotoId);
    if (url) {
      prenda.foto = url;
      subidas++;
      console.log('✅');
    } else {
      noEncontradas++;
      console.log('⚠️  sin foto');
    }
  }

  console.log(`\n  ✅ ${subidas} foto(s) subida(s) a Cloudinary`);
  if (noEncontradas > 0) console.log(`  ⚠️  ${noEncontradas} foto(s) no encontradas`);

  // ── Guardar en MongoDB ──────────────────────────────────────────────────────
  console.log('\n🗄️  Guardando en MongoDB Atlas...');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db('dripbatch').collection('store');

  // Limpiar cualquier base64 que haya quedado
  const clean = {
    ...data,
    prendas: (data.prendas || []).map(p => {
      if (p.foto?.startsWith('data:')) { const { foto, ...r } = p; return r; }
      return p;
    }),
  };

  await col.replaceOne({ _id: 'main' }, { _id: 'main', ...clean }, { upsert: true });
  await client.close();

  console.log('  ✅ Datos guardados en MongoDB');
  console.log('\n🎉 Migración completa. Tu app está lista para desplegarse en Render.\n');
}

migrar().catch(err => {
  console.error('\n❌ Error durante la migración:', err.message);
  process.exit(1);
});
