import React, { useState, useEffect } from 'react';
import { LineChart, ReferenceLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Droplet, Wind, Wifi, Battery, Activity, LayoutDashboard, BarChart3, Clock, AlertTriangle, Menu, X } from 'lucide-react';

// --- CONEXIÓN REAL A FIREBASE ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC6MX8Vw9xZz3OTQCce1P7a2PBF7NFAG8E",
  authDomain: "esp32-project-88df0.firebaseapp.com",
  databaseURL: "https://esp32-project-88df0-default-rtdb.firebaseio.com",
  projectId: "esp32-project-88df0",
  storageBucket: "esp32-project-88df0.appspot.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// --- FIN DE LA CONFIGURACIÓN DE FIREBASE ---


// --- COMPONENTES DE LA UI ---

// Componente para la barra lateral de navegación (adaptado para móvil)
const Sidebar = ({ activeView, setActiveView, isMobileOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Vista General', icon: LayoutDashboard },
    { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  ];

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    onClose(); // Cierra el menú al seleccionar una opción en móvil
  };

  return (
    <>
      {/* Overlay para el fondo en móvil */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Contenido del Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-800 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:flex ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 text-center border-b border-slate-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-400 flex items-center">
            <Droplet className="mr-2" /> SensorHub
          </h1>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${activeView === item.id
                ? 'bg-sky-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 text-center text-xs text-slate-500 border-t border-slate-700">
          <p>&copy; {new Date().getFullYear()} {'Sensor Hub'}</p>
        </div>
      </aside>
    </>
  );
};

// Componente para el encabezado en vista móvil
const MobileHeader = ({ onMenuClick }) => (
  <header className="md:hidden bg-slate-800 text-white p-4 flex items-center shadow-lg">
    <button onClick={onMenuClick} className="mr-4">
      <Menu size={24} />
    </button>
    <h1 className="text-xl font-bold text-sky-400 flex items-center">
      <Droplet className="mr-2" /> SensorHub
    </h1>
  </header>
);


// Componente para las tarjetas de datos principales
const DashboardCard = ({ icon, title, value, unit, color, bgColor }) => {
  const IconComponent = icon;
  return (
    <div className="bg-white shadow-sm rounded-xl p-6 flex items-center space-x-6 transition-transform duration-300 hover:scale-105 hover:shadow-md">
      <div className={`p-4 rounded-full ${bgColor}`}>
        <IconComponent className={`h-8 w-8 ${color}`} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-600">{title}</h2>
        <p className={`text-4xl font-bold ${color}`}>
          {value} <span className="text-2xl font-medium text-slate-500">{unit}</span>
        </p>
      </div>
    </div>
  );
};

// Vista del Dashboard
const DashboardView = ({ lastData }) => {
  if (!lastData) {
    return (
      <div className="p-4 md:p-8 flex justify-center items-center h-full">
        <div className="text-center bg-white p-10 rounded-xl shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-700">No se encontraron datos</h2>
          <p className="text-slate-500 mt-2 max-w-md">
            Asegúrate de que tu base de datos de Firebase tenga datos en la ruta que estás consultando ("ejemplo").
          </p>
        </div>
      </div>
    );
  }

  const date = new Date(Number(lastData.timestamp) * 1000).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'medium' });
  const activity = lastData.elapsed_time_us ? (lastData.elapsed_time_us / 60000000).toFixed(2) : '0.00'; // Convertir microsegundos a minutos


  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Vista General</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <DashboardCard icon={Droplet} title="Presión" value={lastData.pressure.toFixed(2)} unit="bar" color="text-sky-500" bgColor="bg-sky-100" />
        <DashboardCard icon={Wind} title="Caudal" value={lastData.flow.toFixed(2)} unit="L/min" color="text-green-500" bgColor="bg-green-100" />
        <DashboardCard icon={Wifi} title="Señal (RSSI)" value={lastData.rssi} unit="dBm" color="text-rose-500" bgColor="bg-rose-100" />
        <DashboardCard icon={Battery} title="Voltaje" value={5} unit="V" color="text-violet-500" bgColor="bg-violet-100" />
        <DashboardCard icon={Activity} title="Activo" value={activity} unit="min" color="text-orange-500" bgColor="bg-orange-100" />
      </div>
        <div className="text-md text-slate-600 flex items-center"><Clock className="mr-2 h-4 w-4" /> Última Actualización: {date}</div>
    </div>
  );
};

// Componente para las tarjetas de gráficos
const ChartCard = ({ data, dataKey, name, unit, treshold, color }) => (
  <div className="bg-white shadow-lg rounded-xl p-4 md:p-6">
    <h3 className="font-semibold text-slate-700 mb-4">{`${name} (${unit})`}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} syncId="anyId" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickFormatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(5px)',
            border: '1px solid #e0e0e0',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
        />
        <Legend />
        <ReferenceLine y={treshold} label="Max" stroke="red" />
        <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Vista de los gráficos
const ChartsView = ({ history }) => {
  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Gráficas Históricas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard data={history} dataKey="pressure" name="Presión" unit="bar" treshold="2.7" color="#0ea5e9" />
        <ChartCard data={history} dataKey="flow" name="Caudal" unit="L/min" treshold="6" color="#22c55e" />
        <div className="lg:col-span-2">
          <ChartCard data={history} dataKey="rssi" name="Señal (RSSI)" unit="dBm" treshold="" color="#f43f5e" />
        </div>
      </div>
    </div>
  );
};

// Componente principal de la aplicación
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [lastData, setLastData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const dbRef = ref(db, "ejemplo");
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const values = snapshot.val();
        const sortedKeys = Object.keys(values).sort((a, b) => a - b);

        const latestKey = sortedKeys[sortedKeys.length - 1];
        setLastData({ timestamp: latestKey, ...values[latestKey] });

        const dataArr = sortedKeys.map((timestamp) => ({
          timestamp: Number(timestamp) * 1000,
          time: new Date(Number(timestamp) * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          pressure: values[timestamp].pressure,
          flow: values[timestamp].flow,
          rssi: values[timestamp].rssi,
        }));
        setHistory(dataArr);
        setLoading(false);
      } else {
        console.log("No hay datos disponibles");
        setLastData(null);
        setHistory([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        lastData={lastData}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-col flex-1 w-full">
        <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-xl font-semibold text-slate-600 animate-pulse">Cargando datos...</div>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && <DashboardView lastData={lastData} />}
              {activeView === 'charts' && <ChartsView history={history} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
