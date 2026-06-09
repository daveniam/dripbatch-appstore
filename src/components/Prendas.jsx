import { useState } from 'react';
import { nextId, diasEnTienda, formatCurrency, calcPrecioPiso, calcPrecioVenta, upsertComprador } from '../store';
import CamaraModal from './CamaraModal';
import Thumbnail from './Thumbnail';
import CompradorAutocomplete from './CompradorAutocomplete';

const EMPRESAS_ENVIO = [
  'Servientrega', 'Interrapidísimo', 'Coordinadora', '4-72 (Correo Colombiano)',
  'Deprisa', 'Enví@', 'TCC', 'Mensajeros Urbanos', 'Domina', 'Otro',
];

const emptyForm = {
  paqueteId: '',
  marca: '',
  descripcion: '',
  condicion: '',
  pctPiso: '60',
  pctVenta: '100',
  fechaEntrada: new Date().toISOString().slice(0, 10),
  foto: null,
};

const CONDICIONES = [
  { value: '5', label: '⭐⭐⭐⭐⭐ Como nuevo',    color: 'bg-green-100 text-green-700' },
  { value: '4', label: '⭐⭐⭐⭐ Muy bueno',       color: 'bg-lime-100 text-lime-700' },
  { value: '3', label: '⭐⭐⭐ Bueno',             color: 'bg-amber-100 dark:bg-amber-700 text-amber-800 dark:text-amber-100' },
  { value: '2', label: '⭐⭐ Regular',             color: 'bg-orange-100 text-orange-700' },
  { value: '1', label: '⭐ Con detalles',          color: 'bg-red-100 text-red-700' },
];

const ESTADOS = ['todas', 'en tienda', 'reservadas', 'vendidas'];

export default function Prendas({ data, update }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroPaquete, setFiltroPaquete] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 50;
  const [ventaModal, setVentaModal] = useState(null);
  const [precioFinalVenta, setPrecioFinalVenta] = useState('');
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().slice(0, 10));
  const [comprador, setComprador] = useState({ nombre: '', telefono: '', direccion: '', nota: '' });
  const [marcarEnviado, setMarcarEnviado] = useState(false);
  const [envioForm, setEnvioForm] = useState({ empresa: '', guia: '', empresaCustom: '' });
  const [reservaModal, setReservaModal] = useState(null);
  const [reservaForm, setReservaForm] = useState({ nombre: '', telefono: '', direccion: '', nota: '', fechaReserva: new Date().toISOString().slice(0, 10) });
  const [showCamara, setShowCamara] = useState(false);

  const paqueteSeleccionado = data.paquetes.find(p => p.id === parseInt(form.paqueteId));
  const costoBase = paqueteSeleccionado?.costoPorPrenda ?? 0;
  const precioPiso = costoBase ? calcPrecioPiso(costoBase, parseFloat(form.pctPiso) || 0) : 0;
  const precioVenta = costoBase ? calcPrecioVenta(costoBase, parseFloat(form.pctVenta) || 0) : 0;

  const marcas = [...new Set(data.prendas.map(p => p.marca))].sort();

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.paqueteId || !form.marca || !costoBase) return;

    const prenda = {
      paqueteId: parseInt(form.paqueteId),
      marca: form.marca.trim(),
      descripcion: form.descripcion.trim(),
      condicion: form.condicion,
      costoBase,
      pctPiso: parseFloat(form.pctPiso),
      pctVenta: parseFloat(form.pctVenta),
      precioPiso: calcPrecioPiso(costoBase, parseFloat(form.pctPiso)),
      precioVenta: calcPrecioVenta(costoBase, parseFloat(form.pctVenta)),
      fechaEntrada: form.fechaEntrada,
      fechaSalida: null,
      precioFinalVenta: null,
      foto: form.foto || null,
    };

    update(prev => {
      if (editId !== null) {
        return {
          ...prev,
          prendas: prev.prendas.map(p =>
            p.id === editId
              ? { ...prenda, id: editId, fechaSalida: p.fechaSalida, precioFinalVenta: p.precioFinalVenta }
              : p
          ),
        };
      }
      return {
        ...prev,
        prendas: [...prev.prendas, { ...prenda, id: nextId(prev.prendas) }],
      };
    });
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(pr) {
    setForm({
      paqueteId: String(pr.paqueteId),
      marca: pr.marca,
      descripcion: pr.descripcion,
      condicion: pr.condicion || '',
      pctPiso: String(pr.pctPiso),
      pctVenta: String(pr.pctVenta),
      fechaEntrada: pr.fechaEntrada,
      foto: pr.foto || null,
    });
    setEditId(pr.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar esta prenda?')) return;
    update(prev => ({ ...prev, prendas: prev.prendas.filter(p => p.id !== id) }));
  }

  function abrirVenta(pr) {
    setVentaModal(pr);
    setPrecioFinalVenta(String(pr.precioVenta.toFixed(2)));
    setFechaSalida(new Date().toISOString().slice(0, 10));
    // Si tiene reserva, pre-llenar con esos datos
    setComprador({
      nombre: pr.reserva?.nombre || '',
      telefono: pr.reserva?.telefono || '',
      direccion: pr.reserva?.direccion || '',
      nota: pr.reserva?.nota || '',
    });
    setMarcarEnviado(false);
    setEnvioForm({ empresa: '', guia: '', empresaCustom: '' });
  }

  function confirmarVenta() {
    const hoy = new Date().toISOString().slice(0, 10);
    const datosComprador = {
      nombre: comprador.nombre.trim(),
      telefono: comprador.telefono.trim(),
      direccion: comprador.direccion.trim(),
      nota: comprador.nota.trim(),
    };
    update(prev => {
      // upsert comprador
      const { compradores: compradoresActualizados, compradorId } =
        datosComprador.nombre || datosComprador.telefono
          ? upsertComprador(prev.compradores || [], datosComprador, hoy)
          : { compradores: prev.compradores || [], compradorId: null };

      return {
        ...prev,
        compradores: compradoresActualizados,
        prendas: prev.prendas.map(p =>
          p.id === ventaModal.id
            ? {
                ...p,
                fechaSalida,
                precioFinalVenta: parseFloat(precioFinalVenta),
                reserva: null,
                comprador: datosComprador,
                compradorId,
                enviado: marcarEnviado,
                fechaEnvio: marcarEnviado ? hoy : null,
                envioEmpresa: marcarEnviado ? (envioForm.empresa === 'Otro' ? envioForm.empresaCustom.trim() : envioForm.empresa) : null,
                envioGuia: marcarEnviado ? envioForm.guia.trim() : null,
              }
            : p
        ),
      };
    });
    setVentaModal(null);
  }

  function devolverATienda(id) {
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === id ? { ...p, fechaSalida: null, precioFinalVenta: null, comprador: null } : p
      ),
    }));
  }

  function abrirReserva(pr) {
    setReservaModal(pr);
    setReservaForm({ nombre: pr.reserva?.nombre || '', telefono: pr.reserva?.telefono || '', direccion: pr.reserva?.direccion || '', nota: pr.reserva?.nota || '', fechaReserva: pr.reserva?.fechaReserva || new Date().toISOString().slice(0, 10) });
  }

  function confirmarReserva() {
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === reservaModal.id
          ? { ...p, reserva: { ...reservaForm, nombre: reservaForm.nombre.trim(), telefono: reservaForm.telefono.trim(), direccion: reservaForm.direccion.trim(), nota: reservaForm.nota.trim() } }
          : p
      ),
    }));
    setReservaModal(null);
  }

  function cancelarReserva(id) {
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === id ? { ...p, reserva: null } : p
      ),
    }));
  }

  const prendasFiltradas = data.prendas
    .filter(p => {
      if (filtroEstado === 'en tienda') return !p.fechaSalida && !p.reserva;
      if (filtroEstado === 'reservadas') return !p.fechaSalida && !!p.reserva;
      if (filtroEstado === 'vendidas') return !!p.fechaSalida;
      return true;
    })
    .filter(p => !filtroMarca || p.marca === filtroMarca)
    .filter(p => !filtroPaquete || p.paqueteId === parseInt(filtroPaquete))
    .sort((a, b) => {
      if (!a.fechaSalida && b.fechaSalida) return -1;
      if (a.fechaSalida && !b.fechaSalida) return 1;
      return new Date(b.fechaEntrada) - new Date(a.fechaEntrada);
    });

  const totalPaginas = Math.max(1, Math.ceil(prendasFiltradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const prendas = prendasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function cambiarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Prendas</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
          disabled={data.paquetes.length === 0}
          title={data.paquetes.length === 0 ? 'Primero registrá un paquete' : ''}
        >
          + Nueva prenda
        </button>
      </div>

      {data.paquetes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20">
          Primero registrá al menos un paquete en la sección Paquetes.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-200">{editId !== null ? 'Editar prenda' : 'Registrar prenda'}</h3>

          {/* Foto */}
          <div className="flex items-center gap-4">
            {form.foto ? (
              <div className="relative shrink-0">
                <Thumbnail src={form.foto} alt="Foto prenda" size="md" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, foto: null }))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600 leading-none z-10"
                  title="Quitar foto"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-300 dark:text-gray-600 text-3xl shrink-0">
                👗
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowCamara(true)}
              className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              📷 {form.foto ? 'Cambiar foto' : 'Agregar foto'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Paquete de origen</label>
              <select
                value={form.paqueteId}
                onChange={e => setForm(f => ({ ...f, paqueteId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              >
                <option value="">Seleccionar paquete...</option>
                {data.paquetes.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id} — {new Date(p.fechaLlegada).toLocaleDateString('es-AR')} — {formatCurrency(p.costoPorPrenda)}/prenda
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fecha de entrada a tienda</label>
              <input
                type="date"
                value={form.fechaEntrada}
                onChange={e => setForm(f => ({ ...f, fechaEntrada: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Marca</label>
              {marcas.length > 0 ? (
                <select
                  value={marcas.includes(form.marca) ? form.marca : '__nueva__'}
                  onChange={e => {
                    if (e.target.value !== '__nueva__') setForm(f => ({ ...f, marca: e.target.value }));
                    else setForm(f => ({ ...f, marca: '' }));
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 mb-2"
                >
                  {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__nueva__">+ Nueva marca...</option>
                </select>
              ) : null}
              {(!marcas.includes(form.marca) || marcas.length === 0) && (
                <input
                  type="text"
                  value={form.marca}
                  onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                  placeholder="ej: Lacoste"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                  autoFocus={marcas.length > 0}
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Estado / Condición</label>
              <select
                value={form.condicion}
                onChange={e => setForm(f => ({ ...f, condicion: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Sin especificar</option>
                {CONDICIONES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="ej: Remera talle M azul"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">% Margen piso (mínimo)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.pctPiso}
                onChange={e => setForm(f => ({ ...f, pctPiso: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">% Margen venta (óptimo)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.pctVenta}
                onChange={e => setForm(f => ({ ...f, pctVenta: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
          </div>

          {costoBase > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-center">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Costo base</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{formatCurrency(costoBase)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm text-center">
                <p className="text-orange-500 text-xs">Precio piso ({form.pctPiso}%)</p>
                <p className="font-bold text-orange-700">{formatCurrency(precioPiso)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm text-center">
                <p className="text-green-500 text-xs">Precio venta ({form.pctVenta}%)</p>
                <p className="font-bold text-green-700">{formatCurrency(precioVenta)}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
              {editId !== null ? 'Guardar cambios' : 'Registrar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {ESTADOS.map(e => {
            const activo = filtroEstado === e;
            const color =
              e === 'en tienda'  ? activo ? 'bg-amber-500 text-white'  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            : e === 'reservadas' ? activo ? 'bg-purple-600 text-white' : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
            : e === 'vendidas'   ? activo ? 'bg-green-600 text-white'  : 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
            : activo ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
            return (
              <button
                key={e}
                onClick={() => cambiarFiltro(setFiltroEstado, e)}
                className={`px-3 py-1 rounded text-sm capitalize transition-colors ${color}`}
              >
                {e}
              </button>
            );
          })}
        </div>
        <select
          value={filtroMarca}
          onChange={e => cambiarFiltro(setFiltroMarca, e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none"
        >
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filtroPaquete}
          onChange={e => cambiarFiltro(setFiltroPaquete, e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none"
        >
          <option value="">Todos los paquetes</option>
          {[...data.paquetes]
            .sort((a, b) => new Date(b.fechaLlegada) - new Date(a.fechaLlegada))
            .map(p => (
              <option key={p.id} value={p.id}>
                Paquete #{p.id} — {new Date(p.fechaLlegada).toLocaleDateString('es-AR')}{p.notas ? ` (${p.notas})` : ''}
              </option>
            ))}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{prendasFiltradas.length} prenda(s)</span>
      </div>

      {prendas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">👗</p>
          <p>No hay prendas para mostrar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto dark:text-gray-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-left text-gray-600 dark:text-gray-200 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-3 py-3">Foto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Marca / Descripción</th>
                  <th className="px-4 py-3">Costo base</th>
                  <th className="px-4 py-3">Precio piso</th>
                  <th className="px-4 py-3">Precio venta</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3">Comprador</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prendas.map(pr => {
                  const dias = diasEnTienda(pr.fechaEntrada, pr.fechaSalida);
                  const vendida = !!pr.fechaSalida;
                  const reservada = !vendida && !!pr.reserva;
                  return (
                    <tr key={pr.id} className={`border-t dark:border-gray-700 ${vendida ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-400' : reservada ? 'bg-purple-50 dark:bg-purple-950 dark:text-gray-100' : 'dark:bg-gray-800'}`}>
                      <td className="px-3 py-2">
                        <Thumbnail src={pr.foto} alt={pr.marca} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          vendida ? 'bg-green-600 text-white'
                          : reservada ? 'bg-purple-600 text-white'
                          : 'bg-amber-500 text-gray-900'
                        }`}>
                          {vendida ? '✓ Vendida' : reservada ? 'Reservada' : 'En tienda'}
                        </span>
                        {reservada && pr.reserva.nombre && (
                          <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">{pr.reserva.nombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className={`font-medium ${vendida ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{pr.marca}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{pr.descripcion}</p>
                        {pr.condicion && (() => {
                          const c = CONDICIONES.find(x => x.value === pr.condicion);
                          return c ? (
                            <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${c.color}`}>
                              {c.label}
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(pr.costoBase)}</td>
                      <td className={`px-4 py-3 font-medium ${vendida ? 'text-gray-400 dark:text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatCurrency(pr.precioPiso)}
                        <span className="text-xs text-gray-400 ml-1">({pr.pctPiso}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        {vendida ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(pr.precioFinalVenta)}
                            <span className="text-xs text-gray-400 ml-1">(real)</span>
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(pr.precioVenta)}
                            <span className="text-xs text-gray-400 ml-1">({pr.pctVenta}%)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${!vendida && dias > 30 ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                          {dias}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(pr.fechaEntrada).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {pr.fechaSalida ? new Date(pr.fechaSalida).toLocaleDateString('es-AR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {pr.comprador?.nombre ? (
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-gray-700 dark:text-gray-200">{pr.comprador.nombre}</p>
                            {pr.comprador.telefono && <p className="text-gray-400 dark:text-gray-500">{pr.comprador.telefono}</p>}
                            {pr.comprador.direccion && <p className="text-gray-400 dark:text-gray-500 max-w-[140px] truncate" title={pr.comprador.direccion}>{pr.comprador.direccion}</p>}
                            {pr.comprador.nota && <p className="text-gray-400 dark:text-gray-500 italic max-w-[140px] truncate" title={pr.comprador.nota}>{pr.comprador.nota}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {!vendida && (
                            <>
                              <button
                                onClick={() => abrirVenta(pr)}
                                className="text-green-600 hover:text-green-800 text-xs font-medium"
                              >
                                Vendida
                              </button>
                              {!reservada ? (
                                <button
                                  onClick={() => abrirReserva(pr)}
                                  className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                                >
                                  Reservar
                                </button>
                              ) : (
                                <button
                                  onClick={() => abrirReserva(pr)}
                                  className="text-purple-500 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-100 text-xs"
                                >
                                  Ver Reserva
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(pr)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Editar
                              </button>
                            </>
                          )}
                          {vendida && (
                            <button
                              onClick={() => devolverATienda(pr.id)}
                              className="text-amber-600 hover:text-amber-800 text-xs"
                            >
                              Devolver
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(pr.id)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1.5 rounded-lg border dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página <span className="font-semibold text-gray-800">{paginaActual}</span> de {totalPaginas}
                <span className="text-gray-400 ml-2">({prendasFiltradas.length} total)</span>
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 rounded-lg border dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal cámara */}
      {showCamara && (
        <CamaraModal
          onCaptura={base64 => {
            setForm(f => ({ ...f, foto: base64 }));
            setShowCamara(false);
          }}
          onCerrar={() => setShowCamara(false)}
        />
      )}

      {/* Modal de reserva */}
      {reservaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4">
              {reservaModal.foto && <Thumbnail src={reservaModal.foto} alt={reservaModal.marca} size="md" />}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Reservar prenda</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{reservaModal.marca} — {reservaModal.descripcion}</p>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Datos del cliente</p>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fecha de reserva</label>
                <input type="date" value={reservaForm.fechaReserva}
                  onChange={e => setReservaForm(f => ({ ...f, fechaReserva: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <CompradorAutocomplete
                comprador={reservaForm}
                onChange={(field, val) => setReservaForm(f => ({ ...f, [field]: val }))}
                onSelect={c => setReservaForm(f => ({ ...f, nombre: c.nombre || '', telefono: c.telefono || '', direccion: c.direccion || '', nota: f.nota }))}
                compradores={data.compradores}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={confirmarReserva}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
                Confirmar reserva
              </button>
              {reservaModal.reserva && (
                <button onClick={() => { cancelarReserva(reservaModal.id); setReservaModal(null); }}
                  className="text-red-500 hover:text-red-700 text-sm">
                  Cancelar reserva
                </button>
              )}
              <button onClick={() => setReservaModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm ml-auto">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de venta */}
      {ventaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center gap-4">
              {ventaModal.foto && (
                <Thumbnail src={ventaModal.foto} alt={ventaModal.marca} size="md" />
              )}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Registrar venta</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{ventaModal.marca} — {ventaModal.descripcion}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="text-xs text-orange-500">Precio piso</p>
                <p className="font-bold text-orange-700">{formatCurrency(ventaModal.precioPiso)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-500">Precio venta sugerido</p>
                <p className="font-bold text-green-700">{formatCurrency(ventaModal.precioVenta)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Precio de venta real ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioFinalVenta}
                  onChange={e => setPrecioFinalVenta(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fecha de venta</label>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={e => setFechaSalida(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {/* Datos del comprador con autocomplete */}
            <div className="border-t dark:border-gray-700 pt-4">
              <CompradorAutocomplete
                comprador={comprador}
                compradores={data.compradores || []}
                onChange={(field, value) => setComprador(c => ({ ...c, [field]: value }))}
                onSelect={c => setComprador({ nombre: c.nombre, telefono: c.telefono, direccion: c.direccion, nota: c.nota || '' })}
              />
            </div>
            {/* Enviado */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marcarEnviado}
                onChange={e => setMarcarEnviado(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">🚚 Marcar como enviado al confirmar</span>
            </label>

            {marcarEnviado && (
              <div className="space-y-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Datos del envío</p>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Empresa de paquetería</label>
                  <select
                    value={envioForm.empresa}
                    onChange={e => setEnvioForm(f => ({ ...f, empresa: e.target.value, empresaCustom: '' }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">Seleccionar...</option>
                    {EMPRESAS_ENVIO.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {envioForm.empresa === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Nombre de la empresa"
                      value={envioForm.empresaCustom}
                      onChange={e => setEnvioForm(f => ({ ...f, empresaCustom: e.target.value }))}
                      className="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Número de guía / seguimiento</label>
                  <input
                    type="text"
                    value={envioForm.guia}
                    onChange={e => setEnvioForm(f => ({ ...f, guia: e.target.value }))}
                    placeholder="ej: SRV-123456789"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>
            )}

            {precioFinalVenta && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                parseFloat(precioFinalVenta) >= ventaModal.precioPiso
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                Ganancia: {formatCurrency(parseFloat(precioFinalVenta) - ventaModal.costoBase)} (
                {(((parseFloat(precioFinalVenta) - ventaModal.costoBase) / ventaModal.costoBase) * 100).toFixed(1)}%)
                {parseFloat(precioFinalVenta) < ventaModal.precioPiso && (
                  <span className="font-semibold"> ⚠️ Debajo del precio piso</span>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={confirmarVenta}
                disabled={!precioFinalVenta}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Confirmar venta
              </button>
              <button onClick={() => setVentaModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
