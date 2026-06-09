import { useState } from 'react';
import { nextId, formatCurrency } from '../store';

const empty = {
  fechaLlegada: new Date().toISOString().slice(0, 10),
  costoTotal: '',
  cantidadPrendas: '',
  notas: '',
};

const inp = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400';

export default function Paquetes({ data, update }) {
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const costoXPrenda =
    form.costoTotal && form.cantidadPrendas
      ? (parseFloat(form.costoTotal) / parseInt(form.cantidadPrendas)).toFixed(2)
      : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.costoTotal || !form.cantidadPrendas) return;
    const paquete = {
      id: editId ?? null,
      fechaLlegada: form.fechaLlegada,
      costoTotal: parseFloat(form.costoTotal),
      cantidadPrendas: parseInt(form.cantidadPrendas),
      costoPorPrenda: parseFloat(form.costoTotal) / parseInt(form.cantidadPrendas),
      notas: form.notas,
    };
    update(prev => {
      if (editId !== null) {
        return { ...prev, paquetes: prev.paquetes.map(p => p.id === editId ? { ...paquete, id: editId } : p) };
      }
      return { ...prev, paquetes: [...prev.paquetes, { ...paquete, id: nextId(prev.paquetes) }] };
    });
    setForm(empty);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(p) {
    setForm({ fechaLlegada: p.fechaLlegada, costoTotal: String(p.costoTotal), cantidadPrendas: String(p.cantidadPrendas), notas: p.notas || '' });
    setEditId(p.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar este paquete?')) return;
    update(prev => ({ ...prev, paquetes: prev.paquetes.filter(p => p.id !== id) }));
  }

  function prendasDePaquete(paqId) {
    return data.prendas.filter(pr => pr.paqueteId === paqId).length;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Paquetes recibidos</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(empty); }}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          + Nuevo paquete
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-200">{editId !== null ? 'Editar paquete' : 'Registrar paquete'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fecha de llegada</label>
              <input type="date" value={form.fechaLlegada} onChange={e => setForm(f => ({ ...f, fechaLlegada: e.target.value }))} className={inp} required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Costo total del paquete ($)</label>
              <input type="number" min="0" step="0.01" value={form.costoTotal} onChange={e => setForm(f => ({ ...f, costoTotal: e.target.value }))} placeholder="ej: 15000" className={inp} required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Cantidad de prendas</label>
              <input type="number" min="1" value={form.cantidadPrendas} onChange={e => setForm(f => ({ ...f, cantidadPrendas: e.target.value }))} placeholder="ej: 10" className={inp} required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Notas (opcional)</label>
              <input type="text" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="ej: Proveedor X, temporada verano" className={inp} />
            </div>
          </div>
          {costoXPrenda && (
            <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg px-4 py-3 text-sm text-teal-700 dark:text-teal-300">
              Costo base por prenda: <strong>{formatCurrency(parseFloat(costoXPrenda))}</strong>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
              {editId !== null ? 'Guardar cambios' : 'Registrar'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(empty); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {data.paquetes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>No hay paquetes registrados. ¡Agregá el primero!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...data.paquetes]
            .sort((a, b) => new Date(b.fechaLlegada) - new Date(a.fechaLlegada))
            .map(p => {
              const registradas = prendasDePaquete(p.id);
              return (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        Paquete #{p.id} — {new Date(p.fechaLlegada).toLocaleDateString('es-AR')}
                      </p>
                      {p.notas && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{p.notas}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-400 text-sm">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-400 text-sm">Eliminar</button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Costo total</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(p.costoTotal)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Prendas en paquete</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{p.cantidadPrendas}</p>
                    </div>
                    <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-3">
                      <p className="text-teal-500 dark:text-teal-400 text-xs">Costo por prenda</p>
                      <p className="font-semibold text-teal-700 dark:text-teal-300">{formatCurrency(p.costoPorPrenda)}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${registradas === p.cantidadPrendas ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-yellow-900/30'}`}>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Registradas</p>
                      <p className={`font-semibold ${registradas === p.cantidadPrendas ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-yellow-400'}`}>
                        {registradas} / {p.cantidadPrendas}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
