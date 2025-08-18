import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Droplet, Wind, Wifi, Battery, Activity, LayoutDashboard, BarChart3, Clock } from 'lucide-react';

// --- CONEXION DE FIREBASE ---
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";

// --- COMPONENTES DE LA UI ---

// Componente para la barra lateral de navegación
const Sidebar = ({ activeView, setActiveView, lastData }) => {
  const navItems = [
    { id: 'dashboard', label: 'Vista General', icon: LayoutDashboard },
    { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-800 text-white flex-col hidden md:flex">
      <div className="p-6 text-center border-b border-slate-700">
        <h1 className="text-2xl font-bold text-sky-400 flex items-center justify-center">
          <Droplet className="mr-2" /> {'Sensor Monitoring'}
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
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
        <p>&copy; 2025 {'Sensor Monitoring'}</p>
      </div>
    </aside>
  );
};

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
  if (!lastData) return null;
  const date = new Date(Number(lastData.timestamp) * 1000).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  const activity = lastData.elapsed_time_us ? (lastData.elapsed_time_us / 60000000).toFixed(2) : '0.00'; // Convertir microsegundos a minutos

  // Si no hay datos, mostrar un mensaje
  if (!lastData.pressure || !lastData.flow || !lastData.rssi) {
    return (
      <div className="p-4 md:p-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-800 mb-6">Vista General</h2>
        <div className="bg-white shadow-sm rounded-xl p-6 text-center">
          <p className="text-xl font-semibold text-slate-600">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Vista General - Ubicación: Temuco</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <DashboardCard icon={Droplet} title="Presión" value={lastData.pressure.toFixed(2)} unit="bar" color="text-sky-500" bgColor="bg-sky-100" />
        <DashboardCard icon={Wind} title="Caudal" value={lastData.flow.toFixed(2)} unit="L/min" color="text-green-500" bgColor="bg-green-100" />
        <DashboardCard icon={Wifi} title="Señal (RSSI)" value={lastData.rssi} unit="dBm" color="text-rose-500" bgColor="bg-rose-100" />
        <DashboardCard icon={Battery} title="Voltaje" value={5} unit="V" color="text-violet-500" bgColor="bg-violet-100" />
        <DashboardCard icon={Activity} title="Activo" value={activity} unit="min" color="text-orange-500" bgColor="bg-orange-100" />
      </div>
        <p className="text-md md:text-md text-slate-600 flex items-center  absolute bottom-5"><Clock className="mr-2 h-4 w-4" /> Última Actualización: {date}</p>
    </div>
  );
};

// Componente para las tarjetas de gráficos
const ChartCard = ({ data, dataKey, name, unit, color }) => (
  <div className="bg-white shadow-lg rounded-xl p-4 md:p-6">
    <h3 className="font-semibold text-slate-700 mb-4">{`${name} (${unit})`}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(5px)',
            border: '1px solid #e0e0e0',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          // Formatea los valores del tooltip a dos decimales
          formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
        />
        <Legend />
        <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 8, strokeWidth: 2 }} />
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
        <ChartCard data={history} dataKey="pressure" name="Presión" unit="bar" color="#0ea5e9" />
        <ChartCard data={history} dataKey="flow" name="Caudal" unit="L/min" color="#22c55e" />
        <div className="lg:col-span-2">
          <ChartCard data={history} dataKey="rssi" name="Señal (RSSI)" unit="dBm" color="#f43f5e" />
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
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Limpieza al desmontar el componente
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} lastData={lastData} />
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
  );
}