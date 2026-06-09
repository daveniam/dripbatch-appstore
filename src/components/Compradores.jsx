import { useState } from 'react';
import { formatCurrency, formatDate, formatTelefono, nextId } from '../store';
import Thumbnail from './Thumbnail';

const EMPRESAS_ENVIO = [
  'Servientrega', 'Interrapidísimo', 'Coordinadora', '4-72 (Correo Colombiano)',
  'Deprisa', 'Enví@', 'TCC', 'Mensajeros Urbanos', 'Domina', 'Otro',
];

const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400';

export default function Compradores({ data, update }) {
  const [busqueda, setBusqueda]       = useState('');
  const [pagina, setPagina]           = useState(1);
  const POR_PAGINA = 30;
  const [expandido, setExpandido]     = useState(null);
  const [envioModal, setEnvioModal]   = useState(null);
  const [envioForm, setEnvioForm]     = useState({ empresa: '', guia: '', empresaCustom: '' });
  const [editModal, setEditModal]     = useState(null);
  const [editForm, setEditForm]       = useState({ nombre: '', telefono: '', direccion: '', nota: '', nick: '' });
  const [nuevoModal, setNuevoModal]   = useState(false);
  const [ventaModal, setVentaModal]   = useState(null); // { prenda, comprador }
  const [ventaForm, setVentaForm]     = useState({ precioFinal: '', marcarEnviado: false, empresa: '', guia: '', empresaCustom: '' });
  const [nuevoForm, setNuevoForm]     = useState({ nombre: '', telefono: '', direccion: '', nota: '', nick: '' });

  const compradores = data.compradores || [];
  const prendas     = data.prendas     || [];

  const comprFiltrados = compradores
    .filter(c =>
      !busqueda ||
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono?.includes(busqueda)
    )
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  const totalPaginas = Math.max(1, Math.ceil(comprFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const comprPagina  = comprFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  // Compras confirmadas (vendidas)
  function comprasDeComprador(compradorId) {
    return prendas.filter(p => p.compradorId === compradorId && p.fechaSalida);
  }

  // Prendas reservadas que coinciden por teléfono o nombre
  function reservasDeComprador(c) {
    return prendas.filter(p => {
      if (p.fechaSalida || !p.reserva) return false;
      const tel = c.telefono?.replace(/[\s\-]/g, '');
      const rTel = p.reserva.telefono?.replace(/[\s\-]/g, '');
      if (tel && rTel && tel === rTel) return true;
      if (!tel && c.nombre && p.reserva.nombre?.toLowerCase() === c.nombre.toLowerCase()) return true;
      return false;
    });
  }

  function pendientesDeEnvio(compradorId) {
    return comprasDeComprador(compradorId).filter(p => !p.enviado).length;
  }

  // ── Envío ──
  function abrirEnvioModal(prenda) {
    setEnvioModal(prenda);
    setEnvioForm({ empresa: prenda.envioEmpresa || '', guia: prenda.envioGuia || '', empresaCustom: '' });
  }

  function confirmarEnvio() {
    const hoy = new Date().toISOString().slice(0, 10);
    const empresa = envioForm.empresa === 'Otro' ? envioForm.empresaCustom.trim() : envioForm.empresa;
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === envioModal.id
          ? { ...p, enviado: true, fechaEnvio: hoy, envioEmpresa: empresa, envioGuia: envioForm.guia.trim() }
          : p
      ),
    }));
    setEnvioModal(null);
  }

  function deshacerEnvio(prendaId) {
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === prendaId
          ? { ...p, enviado: false, fechaEnvio: null, envioEmpresa: null, envioGuia: null }
          : p
      ),
    }));
  }

  // ── Vender prenda desde reserva ──
  function abrirVentaReserva(prenda, comprador) {
    setVentaModal({ prenda, comprador });
    setVentaForm({ precioFinal: prenda.precioVenta ? Math.round(prenda.precioVenta).toString() : '', marcarEnviado: false, empresa: '', guia: '', empresaCustom: '' });
  }

  function confirmarVentaReserva() {
    if (!ventaModal) return;
    const { prenda, comprador } = ventaModal;
    const hoy = new Date().toISOString().slice(0, 10);
    const empresa = ventaForm.empresa === 'Otro' ? ventaForm.empresaCustom : ventaForm.empresa;
    update(prev => ({
      ...prev,
      prendas: prev.prendas.map(p =>
        p.id === prenda.id ? {
          ...p,
          fechaSalida: hoy,
          precioFinalVenta: parseFloat(ventaForm.precioFinal) || p.precioVenta,
          compradorId: comprador.id,
          reserva: null,
          ...(ventaForm.marcarEnviado ? {
            enviado: true,
            fechaEnvio: hoy,
            envioEmpresa: empresa,
            envioGuia: ventaForm.guia,
          } : {}),
        } : p
      ),
    }));
    setVentaModal(null);
  }

  // ── Crear comprador ──
  function crearComprador() {
    if (!nuevoForm.nombre.trim() && !nuevoForm.telefono.trim()) return;
    update(prev => ({
      ...prev,
      compradores: [...prev.compradores, {
        id: nextId(prev.compradores),
        nombre: nuevoForm.nombre.trim(),
        telefono: nuevoForm.telefono.trim(),
        direccion: nuevoForm.direccion.trim(),
        nota: nuevoForm.nota.trim(),
        nick: nuevoForm.nick.trim(),
      }],
    }));
    setNuevoForm({ nombre: '', telefono: '', direccion: '', nota: '', nick: '' });
    setNuevoModal(false);
  }

  // ── Editar comprador ──
  function abrirEditar(c) {
    setEditModal(c);
    setEditForm({ nombre: c.nombre, telefono: c.telefono, direccion: c.direccion || '', nota: c.nota || '', nick: c.nick || '' });
  }

  function guardarEdicion() {
    const viejo = editModal;
    update(prev => {
      // Actualizar comprador
      const compradores = prev.compradores.map(c =>
        c.id === viejo.id ? { ...c, ...editForm } : c
      );
      // Actualizar reservas en prendas que coincidían con el comprador viejo
      const vTel = viejo.telefono?.replace(/[\s\-]/g, '');
      const prendas = prev.prendas.map(p => {
        if (p.fechaSalida || !p.reserva) return p;
        const rTel = p.reserva.telefono?.replace(/[\s\-]/g, '');
        const coincide = (vTel && rTel && vTel === rTel) ||
          (!vTel && viejo.nombre && p.reserva.nombre?.toLowerCase() === viejo.nombre.toLowerCase());
        if (!coincide) return p;
        return { ...p, reserva: { ...p.reserva, nombre: editForm.nombre, telefono: editForm.telefono, direccion: editForm.direccion || p.reserva.direccion } };
      });
      return { ...prev, compradores, prendas };
    });
    setEditModal(null);
  }

  // ── Eliminar comprador ──
  function eliminarComprador(id) {
    if (!confirm('¿Eliminar este comprador? Sus compras quedarán sin ficha de comprador.')) return;
    update(prev => ({
      ...prev,
      compradores: prev.compradores.filter(c => c.id !== id),
      // desvinculamos el compradorId de sus prendas
      prendas: prev.prendas.map(p => p.compradorId === id ? { ...p, compradorId: null } : p),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Compradores</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{compradores.length} comprador(es)</span>
          <button
            onClick={() => { setNuevoForm({ nombre: '', telefono: '', direccion: '', nota: '', nick: '' }); setNuevoModal(true); }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            + Nuevo comprador
          </button>
        </div>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
        placeholder="Buscar por nombre o teléfono..."
        className={inputClass}
      />

      {comprFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">👥</p>
          <p>{busqueda ? 'Sin resultados.' : 'Los compradores aparecerán aquí al registrar ventas.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comprPagina.map(c => {
            const compras    = comprasDeComprador(c.id);
            const reservas   = reservasDeComprador(c);
            const totalGast  = compras.reduce((s, p) => s + (p.precioFinalVenta || 0), 0);
            const pendientes = pendientesDeEnvio(c.id);
            const abierto    = expandido === c.id;
            const puedeElim  = pendientes === 0;

            return (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                {/* Cabecera — click en toda la fila para expandir */}
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  onClick={() => setExpandido(abierto ? null : c.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {c.nombre ? c.nombre[0].toUpperCase() : '?'}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{c.nombre || 'Sin nombre'}</p>
                        {c.nick && <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">@{c.nick}</span>}
                      </div>
                      {c.telefono && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📞 {c.telefono}</p>}
                      {c.direccion && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">📍 {c.direccion}</p>}

                      {/* Badges + total */}
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        {reservas.length > 0 && (
                          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            {reservas.length} reserva{reservas.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {pendientes > 0 && (
                          <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            🚚 {pendientes} pendiente{pendientes > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-green-700 dark:text-green-400 font-semibold">{formatCurrency(totalGast)}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{compras.length} compra{compras.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Acciones + chevron */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => abrirEditar(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Editar</button>
                        <button
                          onClick={() => puedeElim && eliminarComprador(c.id)}
                          disabled={!puedeElim}
                          title={!puedeElim ? 'Tiene envíos pendientes' : 'Eliminar'}
                          className={`text-xs px-2 py-1 rounded transition-colors ${puedeElim ? 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        >Eliminar</button>
                      </div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{abierto ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-5">

                    {/* Info */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {c.direccion && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Dirección</p>
                          <p className="text-gray-700 dark:text-gray-200">{c.direccion}</p>
                        </div>
                      )}
                      {c.nota && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Nota</p>
                          <p className="text-gray-700 dark:text-gray-200">{c.nota}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Cliente desde</p>
                        <p className="text-gray-700 dark:text-gray-200">{formatDate(c.fechaRegistro)}</p>
                      </div>
                    </div>

                    {/* Prendas reservadas */}
                    {reservas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Prendas separadas / reservadas</p>
                        <div className="space-y-2">
                          {reservas.map(p => (
                            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/60 p-3">
                              <Thumbnail src={p.foto} alt={p.marca} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.marca} — {p.descripcion}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Reservado el {formatDate(p.reserva.fechaReserva)} · Precio venta: {formatCurrency(p.precioVenta)}
                                </p>
                                {p.reserva.nota && <p className="text-xs text-purple-600 dark:text-purple-300 italic">{p.reserva.nota}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">Separada</span>
                                <button
                                  onClick={e => { e.stopPropagation(); abrirVentaReserva(p, c); }}
                                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium whitespace-nowrap"
                                >
                                  ✓ Vender
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Historial de compras */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historial de compras</p>
                      {compras.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin compras registradas.</p>
                      ) : (
                        <div className="space-y-2">
                          {compras
                            .sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida))
                            .map(p => (
                              <div key={p.id} className={`rounded-lg border p-3 ${p.enviado ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-white dark:bg-gray-700/40 border-gray-100 dark:border-gray-600'}`}>
                                <div className="flex gap-3">
                                  <Thumbnail src={p.foto} alt={p.marca} size="sm" />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.marca}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.descripcion}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                                      <span>📅 {formatDate(p.fechaSalida)}</span>
                                      <span className="font-medium text-gray-600 dark:text-gray-300">{formatCurrency(p.precioFinalVenta || 0)}</span>
                                    </div>
                                    {p.enviado && (
                                      <div className="flex flex-wrap gap-2 pt-0.5">
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Enviado el {formatDate(p.fechaEnvio)}</span>
                                        {p.envioEmpresa && <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">📦 {p.envioEmpresa}</span>}
                                        {p.envioGuia && <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">🔖 {p.envioGuia}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  {!p.enviado ? (
                                    <button onClick={() => abrirEnvioModal(p)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
                                      🚚 Marcar enviado
                                    </button>
                                  ) : (
                                    <>
                                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Enviado</span>
                                      <button onClick={() => deshacerEnvio(p.id)} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2">Deshacer</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página <span className="font-semibold text-gray-800">{paginaActual}</span> de {totalPaginas}
                <span className="text-gray-400 ml-2">({comprFiltrados.length} total)</span>
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal venta desde reserva */}
      {ventaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Confirmar venta</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-800 dark:text-gray-100">{ventaModal.prenda.marca}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{ventaModal.prenda.descripcion}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Comprador: <span className="font-medium text-gray-600 dark:text-gray-300">{ventaModal.comprador.nombre}</span></p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Precio final de venta</label>
              <input
                type="number" min="0" step="1"
                value={ventaForm.precioFinal}
                onChange={e => setVentaForm(f => ({ ...f, precioFinal: e.target.value }))}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={ventaForm.marcarEnviado} onChange={e => setVentaForm(f => ({ ...f, marcarEnviado: e.target.checked }))} className="rounded" />
              Marcar como enviado
            </label>
            {ventaForm.marcarEnviado && (
              <div className="space-y-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Empresa de envío</label>
                  <select value={ventaForm.empresa} onChange={e => setVentaForm(f => ({ ...f, empresa: e.target.value }))} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {EMPRESAS_ENVIO.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                {ventaForm.empresa === 'Otro' && (
                  <input type="text" placeholder="Nombre de la empresa" value={ventaForm.empresaCustom} onChange={e => setVentaForm(f => ({ ...f, empresaCustom: e.target.value }))} className={inputClass} />
                )}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Número de guía</label>
                  <input type="text" placeholder="ej: 123456789" value={ventaForm.guia} onChange={e => setVentaForm(f => ({ ...f, guia: e.target.value }))} className={inputClass} />
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={confirmarVentaReserva} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                ✓ Confirmar venta
              </button>
              <button onClick={() => setVentaModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm px-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo comprador */}
      {nuevoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Nuevo comprador</h3>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
              <input type="text" value={nuevoForm.nombre} onChange={e => setNuevoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Juan García" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nick Name</label>
              <input type="text" value={nuevoForm.nick} onChange={e => setNuevoForm(f => ({ ...f, nick: e.target.value }))} placeholder="ej: Juancho" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
              <input type="text" value={nuevoForm.telefono} onChange={e => setNuevoForm(f => ({ ...f, telefono: formatTelefono(e.target.value) }))} placeholder="### ### ####" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección</label>
              <input type="text" value={nuevoForm.direccion} onChange={e => setNuevoForm(f => ({ ...f, direccion: e.target.value }))} placeholder="ej: Calle 123 #45-67" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nota</label>
              <textarea value={nuevoForm.nota} onChange={e => setNuevoForm(f => ({ ...f, nota: e.target.value }))} rows={2} placeholder="ej: Cliente frecuente..." className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={crearComprador} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
                Crear comprador
              </button>
              <button onClick={() => setNuevoModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm px-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar comprador */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Editar comprador</h3>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
              <input type="text" value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nick Name</label>
              <input type="text" value={editForm.nick} onChange={e => setEditForm(f => ({ ...f, nick: e.target.value }))} placeholder="ej: Juancho" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
              <input type="text" value={editForm.telefono} onChange={e => setEditForm(f => ({ ...f, telefono: formatTelefono(e.target.value) }))} placeholder="### ### ####" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección</label>
              <input type="text" value={editForm.direccion} onChange={e => setEditForm(f => ({ ...f, direccion: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nota</label>
              <textarea value={editForm.nota} onChange={e => setEditForm(f => ({ ...f, nota: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={guardarEdicion} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
                Guardar
              </button>
              <button onClick={() => setEditModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm px-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envío */}
      {envioModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Registrar envío</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{envioModal.marca} — {envioModal.descripcion}</p>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Empresa de envíos</label>
              <select
                value={envioForm.empresa}
                onChange={e => setEnvioForm(f => ({ ...f, empresa: e.target.value, empresaCustom: '' }))}
                className={inputClass}
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
                  className={`mt-2 ${inputClass}`}
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Número de guía / seguimiento</label>
              <input
                type="text"
                value={envioForm.guia}
                onChange={e => setEnvioForm(f => ({ ...f, guia: e.target.value }))}
                placeholder="ej: AND-123456789"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={confirmarEnvio} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                Confirmar envío
              </button>
              <button onClick={() => setEnvioModal(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm px-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
