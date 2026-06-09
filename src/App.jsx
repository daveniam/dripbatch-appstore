import { useState, useCallback, useEffect } from 'react';
import { loadData, saveData } from './store';
import Dashboard from './components/Dashboard';
import Paquetes from './components/Paquetes';
import Prendas from './components/Prendas';
import Compradores from './components/Compradores';
import './index.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'prendas', label: 'Prendas' },
  { id: 'compradores', label: 'Compradores' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ paquetes: [], prendas: [], compradores: [] });
  const [cargando, setCargando] = useState(true);
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('tema') === 'oscuro');

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    if (oscuro) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tema', 'oscuro');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tema', 'claro');
    }
  }, [oscuro]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(prev);
      saveData(next);
      return next;
    });
  }, []);

  const enviosPendientes = (data.prendas || []).filter(p => p.fechaSalida && !p.enviado && p.compradorId).length;

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Fila 1: logo + toggle */}
          <div className="flex items-center justify-between">
            <img src={oscuro ? '/Logo2.png' : '/Logo.png'} alt="DripBatch AppStore" className="h-12 md:h-[73px] w-auto" />
            <button
              onClick={() => setOscuro(o => !o)}
              title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-lg"
            >
              {oscuro ? '☀️' : '🌙'}
            </button>
          </div>
          {/* Fila 2: nav a ancho completo */}
          <nav className="flex mt-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex-1 px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-center ${
                  tab === t.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'
                }`}
              >
                {t.label}
                {t.id === 'compradores' && enviosPendientes > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {enviosPendientes > 9 ? '9+' : enviosPendientes}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'dashboard'   && <Dashboard   data={data} update={update} />}
        {tab === 'paquetes'    && <Paquetes    data={data} update={update} />}
        {tab === 'prendas'     && <Prendas     data={data} update={update} />}
        {tab === 'compradores' && <Compradores data={data} update={update} />}
      </main>
    </div>
  );
}
