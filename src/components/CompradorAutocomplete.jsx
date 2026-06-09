import { useState, useRef, useEffect } from 'react';
import { formatTelefono } from '../store';

/**
 * Campos del comprador con autocomplete desde la base de compradores.
 * Props:
 *   comprador       — { nombre, telefono, direccion, nota }
 *   onChange(field, value) — callback por campo
 *   onSelect(comprador)    — callback cuando se elige un comprador del listado
 *   compradores     — array de compradores registrados
 */
export default function CompradorAutocomplete({ comprador, onChange, onSelect, compradores = [] }) {
  const [sugerencias, setSugerencias] = useState([]);
  const [campoActivo, setCampoActivo] = useState(null); // 'nombre' | 'telefono'
  const [indiceSel, setIndiceSel] = useState(-1);
  const listRef = useRef(null);

  function buscar(campo, valor) {
    onChange(campo, valor);
    if (!valor.trim() || compradores.length === 0) {
      setSugerencias([]);
      return;
    }
    const q = valor.toLowerCase().replace(/[\s\-]/g, '');
    const matches = compradores.filter(c => {
      if (campo === 'nombre') return c.nombre?.toLowerCase().includes(valor.toLowerCase());
      if (campo === 'telefono') return c.telefono?.replace(/[\s\-]/g, '').includes(q);
      return false;
    }).slice(0, 6);
    setSugerencias(matches);
    setCampoActivo(campo);
    setIndiceSel(-1);
  }

  function elegir(c) {
    onSelect(c);
    setSugerencias([]);
    setCampoActivo(null);
  }

  function handleKeyDown(e) {
    if (!sugerencias.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceSel(i => Math.min(i + 1, sugerencias.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIndiceSel(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && indiceSel >= 0) { e.preventDefault(); elegir(sugerencias[indiceSel]); }
    if (e.key === 'Escape') { setSugerencias([]); }
  }

  // Cerrar si se hace click fuera
  useEffect(() => {
    function handler(e) {
      if (listRef.current && !listRef.current.contains(e.target)) setSugerencias([]);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400';

  return (
    <div className="space-y-3" ref={listRef}>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Datos del comprador (opcional)
      </p>

      {/* Nombre */}
      <div className="relative">
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
        <input
          type="text"
          value={comprador.nombre}
          onChange={e => buscar('nombre', e.target.value)}
          onFocus={() => buscar('nombre', comprador.nombre)}
          onKeyDown={handleKeyDown}
          placeholder="ej: Juan García"
          className={inputClass}
          autoComplete="off"
        />
        {sugerencias.length > 0 && campoActivo === 'nombre' && (
          <Dropdown sugerencias={sugerencias} indiceSel={indiceSel} onElegir={elegir} />
        )}
      </div>

      {/* Teléfono */}
      <div className="relative">
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
        <input
          type="text"
          value={comprador.telefono}
          onChange={e => buscar('telefono', formatTelefono(e.target.value))}
          onFocus={() => buscar('telefono', comprador.telefono)}
          onKeyDown={handleKeyDown}
          placeholder="ej: +54 9 11 1234-5678"
          className={inputClass}
          autoComplete="off"
        />
        {sugerencias.length > 0 && campoActivo === 'telefono' && (
          <Dropdown sugerencias={sugerencias} indiceSel={indiceSel} onElegir={elegir} />
        )}
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección de envío</label>
        <input
          type="text"
          value={comprador.direccion}
          onChange={e => onChange('direccion', e.target.value)}
          placeholder="ej: Av. Corrientes 1234, CABA"
          className={inputClass}
        />
      </div>

      {/* Nota */}
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nota</label>
        <textarea
          value={comprador.nota}
          onChange={e => onChange('nota', e.target.value)}
          placeholder="ej: Paga en efectivo, entrega el sábado..."
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}

function Dropdown({ sugerencias, indiceSel, onElegir }) {
  return (
    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
      {sugerencias.map((c, i) => (
        <li key={c.id}>
          <button
            type="button"
            onMouseDown={() => onElegir(c)}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              i === indiceSel ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100'
            }`}
          >
            <span className="font-medium">{c.nombre || 'Sin nombre'}</span>
            {c.nick && <span className="text-teal-500 ml-1 text-xs font-medium">@{c.nick}</span>}
            {c.telefono && <span className="text-gray-400 ml-2 text-xs">📞 {c.telefono}</span>}
            {c.direccion && <span className="text-gray-400 ml-2 text-xs">📍 {c.direccion}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
