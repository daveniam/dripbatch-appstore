import { diasEnTienda, formatCurrency } from '../store';
import Thumbnail from './Thumbnail';

function StatCard({ label, value, sub, color = 'teal' }) {
  const colors = {
    teal:   'bg-teal-50   dark:bg-teal-900/30   border-teal-200   dark:border-teal-700   text-teal-700   dark:text-teal-300',
    green:  'bg-green-50  dark:bg-green-900/30  border-green-200  dark:border-green-700  text-green-700  dark:text-green-300',
    yellow: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200',
    red:    'bg-red-50    dark:bg-red-900/30    border-red-200    dark:border-red-700    text-red-700    dark:text-red-300',
    gray:   'bg-gray-50   dark:bg-gray-700      border-gray-200   dark:border-gray-600   text-gray-700   dark:text-gray-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function BarProgress({ value, max, color = 'bg-teal-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-2">
      <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Dashboard({ data }) {
  const { paquetes, prendas } = data;

  const enTienda = prendas.filter(p => !p.fechaSalida);
  const vendidas = prendas.filter(p => p.fechaSalida);
  const enviosPendientes = vendidas.filter(p => !p.enviado && p.compradorId).length;
  const todoVendido = prendas.length > 0 && enTienda.length === 0;

  const totalInvertidoPaquetes = paquetes.reduce((s, p) => s + p.costoTotal, 0);
  const totalRecuperado        = vendidas.reduce((s, p) => s + (p.precioFinalVenta || 0), 0);
  const costoDeLoVendido       = vendidas.reduce((s, p) => s + p.costoBase, 0);
  const ganancia               = totalRecuperado - costoDeLoVendido;
  const capitalEnTienda        = enTienda.reduce((s, p) => s + p.costoBase, 0);
  const valorPotencialEnTienda = enTienda.reduce((s, p) => s + p.precioVenta, 0);
  const pctRecuperado = totalInvertidoPaquetes > 0
    ? ((totalRecuperado / totalInvertidoPaquetes) * 100).toFixed(1) : 0;

  const prendasPorMarca = prendas.reduce((acc, p) => { acc[p.marca] = (acc[p.marca] || 0) + 1; return acc; }, {});
  const top5 = Object.entries(prendasPorMarca).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const prendas30dias = enTienda.filter(p => diasEnTienda(p.fechaEntrada) > 30);

  return (
    <div className="space-y-6">

      {/* BANNER TODO VENDIDO */}
      {todoVendido && (
        <div className="bg-green-500 text-white rounded-2xl px-6 py-4 flex items-center gap-4 shadow-md">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-bold text-lg">¡Todo vendido!</p>
            <p className="text-green-100 text-sm">No quedan prendas en tienda. ¡Hora de traer más stock!</p>
          </div>
        </div>
      )}

      {/* BLOQUE FINANCIERO */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          💰 Resumen financiero
        </h2>
        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Recuperado del total invertido</span>
            <span className="text-lg font-bold text-teal-700 dark:text-teal-400">{pctRecuperado}%</span>
          </div>
          <BarProgress value={totalRecuperado} max={totalInvertidoPaquetes} color="bg-teal-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>$0</span>
            <span>{formatCurrency(totalInvertidoPaquetes)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total invertido en paquetes</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{formatCurrency(totalInvertidoPaquetes)}</p>
            <p className="text-xs text-gray-400 mt-1">{paquetes.length} paquete(s)</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Recuperado (ventas cobradas)</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{formatCurrency(totalRecuperado)}</p>
            <p className="text-xs text-green-500 dark:text-green-400 mt-1">{vendidas.length} prenda(s) vendida(s)</p>
          </div>
          <div className={`rounded-xl border p-4 ${ganancia >= 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}`}>
            <p className={`text-xs font-medium ${ganancia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Ganancia neta (sobre costo)
            </p>
            <p className={`text-2xl font-bold mt-1 ${ganancia >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {formatCurrency(ganancia)}
            </p>
            <p className={`text-xs mt-1 ${ganancia >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-400'}`}>
              {costoDeLoVendido > 0 ? `Margen: ${((ganancia / costoDeLoVendido) * 100).toFixed(1)}%` : 'Sin ventas aún'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex flex-wrap gap-6 items-center justify-between">
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-200/80 font-medium">Capital aún en tienda (a precio de costo)</p>
            <p className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-0.5">{formatCurrency(capitalEnTienda)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-600 dark:text-amber-200/80 font-medium">Valor potencial si se vende todo</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-200 mt-0.5">{formatCurrency(valorPotencialEnTienda)}</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Paquetes recibidos" value={paquetes.length} color="teal" />
        <StatCard label="Prendas en tienda" value={enTienda.length} color="yellow" />
        <StatCard label="Prendas vendidas" value={vendidas.length} color="green" />
        <StatCard label="🚚 Envíos pendientes" value={enviosPendientes} sub={enviosPendientes > 0 ? 'Ver en Compradores' : 'Todo enviado ✓'} color={enviosPendientes > 0 ? 'yellow' : 'green'} />
      </div>

      {/* DESGLOSE POR PAQUETE */}
      {paquetes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
            📦 Desglose por paquete
          </h3>
          <div className="space-y-3">
            {[...paquetes].sort((a, b) => new Date(b.fechaLlegada) - new Date(a.fechaLlegada)).map(paq => {
              const prendasDePaq   = prendas.filter(p => p.paqueteId === paq.id);
              const vendidasDePaq  = prendasDePaq.filter(p => p.fechaSalida);
              const recuperadoDePaq = vendidasDePaq.reduce((s, p) => s + (p.precioFinalVenta || 0), 0);
              const pctRec = paq.costoTotal > 0 ? Math.min((recuperadoDePaq / paq.costoTotal) * 100, 100) : 0;
              const superado = recuperadoDePaq > paq.costoTotal;
              return (
                <div key={paq.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">Paquete #{paq.id}</span>
                      <span className="text-xs text-gray-400 ml-2">{new Date(paq.fechaLlegada).toLocaleDateString('es-AR')}</span>
                      {paq.notas && <span className="text-xs text-gray-400 ml-2">— {paq.notas}</span>}
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Invertido: </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(paq.costoTotal)}</span>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                      <span className="text-gray-500 dark:text-gray-400">Recuperado: </span>
                      <span className={`font-semibold ${superado ? 'text-green-700 dark:text-green-400' : 'text-teal-700 dark:text-teal-400'}`}>{formatCurrency(recuperadoDePaq)}</span>
                      {superado && <span className="ml-1 text-xs text-green-600 font-medium">✓ Cubierto</span>}
                    </div>
                  </div>
                  <BarProgress value={recuperadoDePaq} max={paq.costoTotal} color={superado ? 'bg-green-500' : 'bg-teal-400'} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{vendidasDePaq.length} vendidas de {paq.cantidadPrendas} ({prendasDePaq.length} registradas)</span>
                    <span>{pctRec.toFixed(0)}% recuperado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* +30 días */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">
            ⚠️ Prendas +30 días en tienda ({prendas30dias.length})
          </h3>
          {prendas30dias.length === 0 ? (
            <p className="text-sm text-gray-400">Sin prendas con más de 30 días.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {prendas30dias.sort((a, b) => diasEnTienda(b.fechaEntrada) - diasEnTienda(a.fechaEntrada)).map(p => (
                <div key={p.id} className="flex justify-between items-center text-sm border-b dark:border-gray-700 pb-1">
                  <div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{p.marca}</span>
                    {p.descripcion && <span className="text-gray-400 text-xs ml-1">— {p.descripcion}</span>}
                  </div>
                  <span className="font-medium text-orange-600 shrink-0 ml-2">{diasEnTienda(p.fechaEntrada)} días</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top marcas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Top marcas</h3>
          {top5.length === 0 ? (
            <p className="text-sm text-gray-400">Sin prendas registradas.</p>
          ) : (
            <div className="space-y-2">
              {top5.map(([marca, qty]) => {
                const pct = Math.round((qty / prendas.length) * 100);
                return (
                  <div key={marca}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-200">{marca}</span>
                      <span className="text-gray-500 dark:text-gray-400">{qty} prendas</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ENVÍOS REALIZADOS */}
      {(() => {
        const enviados  = vendidas.filter(p => p.enviado).sort((a, b) => new Date(b.fechaEnvio) - new Date(a.fechaEnvio));
        const pendientes = vendidas.filter(p => !p.enviado && p.compradorId);
        return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">🚚 Envíos</h3>
              <div className="flex gap-3 text-xs">
                <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">
                  ✓ {enviados.length} realizado{enviados.length !== 1 ? 's' : ''}
                </span>
                {pendientes.length > 0 && (
                  <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full font-medium">
                    ⏳ {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {enviados.length === 0 ? (
              <p className="text-sm text-gray-400">Aún no hay envíos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                      <th className="pb-2 pr-3">Foto</th>
                      <th className="pb-2 pr-3">Prenda</th>
                      <th className="pb-2 pr-3">Comprador</th>
                      <th className="pb-2 pr-3">Empresa</th>
                      <th className="pb-2 pr-3">Guía</th>
                      <th className="pb-2">Fecha envío</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enviados.slice(0, 15).map(p => {
                      const comprador = (data.compradores || []).find(c => c.id === p.compradorId);
                      return (
                        <tr key={p.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-2 pr-3"><Thumbnail src={p.foto} alt={p.marca} size="sm" /></td>
                          <td className="py-2 pr-3">
                            <p className="font-medium text-gray-800 dark:text-gray-100">{p.marca}</p>
                            <p className="text-xs text-gray-400">{p.descripcion}</p>
                          </td>
                          <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">
                            {comprador ? comprador.nombre : p.comprador?.nombre || '—'}
                            {(comprador?.telefono || p.comprador?.telefono) && (
                              <p className="text-xs text-gray-400">📞 {comprador?.telefono || p.comprador?.telefono}</p>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            {p.envioEmpresa ? <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">📦 {p.envioEmpresa}</span> : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="py-2 pr-3">
                            {p.envioGuia ? <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">🔖 {p.envioGuia}</span> : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="py-2 text-gray-500 dark:text-gray-400 text-xs">
                            {p.fechaEnvio ? new Date(p.fechaEnvio).toLocaleDateString('es-CO') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {enviados.length > 15 && <p className="text-xs text-gray-400 mt-2 text-center">Mostrando los últimos 15 de {enviados.length} envíos.</p>}
              </div>
            )}
          </div>
        );
      })()}

      {/* ÚLTIMAS VENTAS */}
      {vendidas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Últimas ventas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 text-xs">
                  <th className="pb-2 pr-4">Foto</th>
                  <th className="pb-2 pr-4">Marca</th>
                  <th className="pb-2 pr-4">Descripción</th>
                  <th className="pb-2 pr-4">Costo</th>
                  <th className="pb-2 pr-4">Vendido</th>
                  <th className="pb-2 pr-4">Ganancia</th>
                  <th className="pb-2 pr-4">Días</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {[...vendidas].sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida)).slice(0, 10).map(p => {
                  const gan = (p.precioFinalVenta || 0) - p.costoBase;
                  return (
                    <tr key={p.id} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 pr-4"><Thumbnail src={p.foto} alt={p.marca} size="sm" /></td>
                      <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-100">{p.marca}</td>
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs">{p.descripcion}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{formatCurrency(p.costoBase)}</td>
                      <td className="py-2 pr-4 text-green-700 dark:text-green-400 font-medium">{formatCurrency(p.precioFinalVenta || 0)}</td>
                      <td className="py-2 pr-4">
                        <span className={`font-medium text-xs ${gan >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {gan >= 0 ? '+' : ''}{formatCurrency(gan)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{diasEnTienda(p.fechaEntrada, p.fechaSalida)}d</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{new Date(p.fechaSalida).toLocaleDateString('es-AR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
