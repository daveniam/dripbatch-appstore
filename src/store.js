const defaultData = { paquetes: [], prendas: [], compradores: [] };

export async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('no response');
    const d = await res.json();
    // migración: si data.json no tiene compradores aún, agregarlo
    if (!d.compradores) d.compradores = [];
    return d;
  } catch {
    return defaultData;
  }
}

export async function saveData(data) {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Error guardando datos:', err);
  }
}

export function nextId(items) {
  return items.length === 0 ? 1 : Math.max(...items.map(i => i.id)) + 1;
}

/**
 * Busca un comprador por teléfono (deduplicación principal).
 * Ignora espacios y guiones para comparar.
 */
export function findCompradorByTelefono(compradores, telefono) {
  if (!telefono || !telefono.trim()) return null;
  const norm = telefono.replace(/[\s\-]/g, '');
  return compradores.find(c => c.telefono && c.telefono.replace(/[\s\-]/g, '') === norm) || null;
}

/**
 * Inserta o actualiza un comprador.
 * Devuelve { compradores: [...], compradorId: number }
 */
export function upsertComprador(compradores, datos, hoy) {
  const { nombre, telefono, direccion, nota } = datos;
  const existente = findCompradorByTelefono(compradores, telefono);
  if (existente) {
    // Actualizar datos con los más recientes (no sobreescribir si viene vacío)
    const actualizados = compradores.map(c =>
      c.id === existente.id
        ? {
            ...c,
            nombre: nombre || c.nombre,
            direccion: direccion || c.direccion,
            nota: nota || c.nota,
          }
        : c
    );
    return { compradores: actualizados, compradorId: existente.id };
  }
  // Crear nuevo
  const id = nextId(compradores);
  return {
    compradores: [
      ...compradores,
      { id, nombre, telefono, direccion, nota, fechaRegistro: hoy },
    ],
    compradorId: id,
  };
}

export function calcPrecioPiso(costoBase, pct) {
  return costoBase * (1 + pct / 100);
}

export function calcPrecioVenta(costoBase, pct) {
  return costoBase * (1 + pct / 100);
}

export function diasEnTienda(fechaEntrada, fechaSalida) {
  const inicio = new Date(fechaEntrada);
  const fin = fechaSalida ? new Date(fechaSalida) : new Date();
  return Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
}

export function formatCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}

// Formatea teléfono como ### ### ####
export function formatTelefono(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
}
