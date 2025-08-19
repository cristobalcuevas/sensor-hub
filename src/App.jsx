import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, ReferenceLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Droplet, Gauge, Waves, Wifi, Battery, Activity, LayoutDashboard, 
  BarChart3, Clock, AlertTriangle, Menu, X, MapPin 
} from 'lucide-react';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"


import { ref, onValue } from "firebase/database";
import { db } from "./firebase.js";

// Constants
const CONSTANTS = {
  DEVICE_NAME: 'SensorHub',
  SENSOR_LOCATION: [-36.821966, -73.013411],
  THRESHOLDS: {
    pressure: 2.7,
    flow: 6,
    rssi: -70
  },
  COLORS: {
    sky: '#0ea5e9',
    green: '#22c55e',
    rose: '#f43f5e',
    violet: '#8b5cf6',
    orange: '#f97316'
  }
};

// Navigation configuration
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Vista General', icon: LayoutDashboard },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 }
];

// Custom hooks
const useFirebaseData = () => {
  const [lastData, setLastData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const dbRef = ref(db, "ejemplo");
    
    const unsubscribe = onValue(dbRef, 
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const values = snapshot.val();
            const sortedKeys = Object.keys(values).sort((a, b) => Number(a) - Number(b));

            if (sortedKeys.length > 0) {
              const latestKey = sortedKeys[sortedKeys.length - 1];
              setLastData({ 
                timestamp: latestKey, 
                device: CONSTANTS.DEVICE_NAME,
                ...values[latestKey] 
              });

              const dataArr = sortedKeys.map((timestamp) => ({
                timestamp: Number(timestamp) * 1000,
                time: new Date(Number(timestamp) * 1000).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                pressure: Number(values[timestamp].pressure) || 0,
                flow: Number(values[timestamp].flow) || 0,
                rssi: Number(values[timestamp].rssi) || 0,
              }));
              
              setHistory(dataArr);
            }
            setError(null);
          } else {
            setLastData(null);
            setHistory([]);
            setError('No hay datos disponibles en la base de datos');
          }
        } catch (err) {
          setError('Error al procesar los datos: ' + err.message);
          console.error('Firebase data processing error:', err);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError('Error de conexión: ' + error.message);
        setLoading(false);
        console.error('Firebase connection error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  return { lastData, history, loading, error };
};

const useMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const openMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  
  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, closeMenu]);
  
  return { isMobileMenuOpen, openMenu, closeMenu };
};

// Utility functions
const formatTimestamp = (timestamp) => {
  return new Date(Number(timestamp) * 1000).toLocaleString('es-ES', { 
    dateStyle: 'long', 
    timeStyle: 'medium' 
  });
};

const calculateActivity = (elapsedTimeUs) => {
  if (!elapsedTimeUs) return '0.00';
  return (elapsedTimeUs / 60000000).toFixed(2);
};

const formatValue = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) return '0.00';
  return value.toFixed(decimals);
};

// Components
const Sidebar = React.memo(({ activeView, setActiveView, lastData, isMobileOpen, onClose }) => {
  const handleNavClick = useCallback((viewId) => {
    setActiveView(viewId);
    onClose();
  }, [setActiveView, onClose]);

  const deviceName = lastData?.device || CONSTANTS.DEVICE_NAME;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar content */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-slate-800 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:flex ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="p-6 text-center border-b border-slate-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-400 flex items-center">
            <Droplet className="mr-2" aria-hidden="true" /> 
            {deviceName}
          </h1>
          <button 
            onClick={onClose} 
            className="md:hidden text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 rounded p-1"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2" role="navigation">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                activeView === item.id
                  ? 'bg-sky-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 text-center text-xs text-slate-500 border-t border-slate-700">
          <p>&copy; {new Date().getFullYear()} {deviceName}</p>
        </div>
      </aside>
    </>
  );
});

const MobileHeader = React.memo(({ onMenuClick }) => (
  <header className="md:hidden bg-slate-800 text-white p-4 flex items-center shadow-lg">
    <button 
      onClick={onMenuClick} 
      className="mr-4 focus:outline-none focus:ring-2 focus:ring-sky-400 rounded p-1"
      aria-label="Abrir menú de navegación"
    >
      <Menu size={24} />
    </button>
    <h1 className="text-xl font-bold text-sky-400 flex items-center">
      <Droplet className="mr-2" aria-hidden="true" /> 
      {CONSTANTS.DEVICE_NAME}
    </h1>
  </header>
));

const DashboardCard = React.memo(({ icon: Icon, title, value, unit, color, bgColor }) => (
  <div className="bg-white shadow-sm rounded-xl p-6 flex items-center space-x-6 transition-all duration-300 hover:scale-105 hover:shadow-md">
    <div className={`p-4 rounded-full ${bgColor}`}>
      <Icon className={`h-8 w-8 ${color}`} aria-hidden="true" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-slate-600">{title}</h2>
      <p className={`text-4xl font-bold ${color}`}>
        {value} <span className="text-2xl font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  </div>
));

const MapCard = React.memo(({ position, deviceData }) => {
  const isValidPosition = useMemo(() => 
    position && Array.isArray(position) && position.length === 2 &&
    position.every(coord => typeof coord === 'number' && !isNaN(coord))
  , [position]);

  if (!isValidPosition) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-slate-600 flex items-center justify-center">
          <MapPin className="mr-2 h-5 w-5" />
          Ubicación del Sensor
        </h3>
        <p className="text-slate-500 mt-2">No hay datos de ubicación disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-4">
      <h3 className="font-semibold text-slate-700 mb-4 px-2 flex items-center">
        <MapPin className="mr-2 h-5 w-5" />
        Ubicación del Sensor
      </h3>
      <div className="h-80 w-full rounded-lg overflow-hidden">
        <MapContainer 
          center={position} 
          zoom={15} 
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="filter grayscale"
          />
          <Marker position={position}>
            <Popup>
              <div className="text-sm">
                <p><strong>Presión:</strong> {formatValue(deviceData?.pressure)} bar</p>
                <p><strong>Caudal:</strong> {formatValue(deviceData?.flow)} L/min</p>
                <p><strong>RSSI:</strong> {deviceData?.rssi} dBm</p>
                <p><strong>Última actualización:</strong> {formatTimestamp(deviceData?.timestamp)}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
});

const ErrorBoundary = ({ error }) => (
  <div className="p-4 md:p-8 flex justify-center items-center h-full">
    <div className="text-center bg-white p-10 rounded-xl shadow-lg max-w-md">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="mt-4 text-2xl font-semibold text-slate-700">Error</h2>
      <p className="text-slate-500 mt-2">{error}</p>
    </div>
  </div>
);

const LoadingState = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
      <div className="text-xl font-semibold text-slate-600">Cargando datos...</div>
    </div>
  </div>
);

const DashboardView = React.memo(({ lastData }) => {
  const dashboardData = useMemo(() => {
    if (!lastData) return null;
    
    return {
      cards: [
        { 
          icon: Gauge, 
          title: "Presión", 
          value: formatValue(lastData.pressure), 
          unit: "bar", 
          color: "text-sky-500", 
          bgColor: "bg-sky-100" 
        },
        { 
          icon: Waves, 
          title: "Caudal", 
          value: formatValue(lastData.flow), 
          unit: "L/min", 
          color: "text-green-500", 
          bgColor: "bg-green-100" 
        },
        { 
          icon: Wifi, 
          title: "Señal (RSSI)", 
          value: lastData.rssi, 
          unit: "dBm", 
          color: "text-rose-500", 
          bgColor: "bg-rose-100" 
        },
        { 
          icon: Battery, 
          title: "Voltaje", 
          value: "5.00", 
          unit: "V", 
          color: "text-violet-500", 
          bgColor: "bg-violet-100" 
        },
        { 
          icon: Activity, 
          title: "Activo", 
          value: calculateActivity(lastData.elapsed_time_us), 
          unit: "min", 
          color: "text-orange-500", 
          bgColor: "bg-orange-100" 
        }
      ],
      lastUpdate: formatTimestamp(lastData.timestamp)
    };
  }, [lastData]);

  if (!dashboardData) {
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

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Vista General</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {dashboardData.cards.map((card, index) => (
          <DashboardCard key={index} {...card} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <MapCard position={CONSTANTS.SENSOR_LOCATION} deviceData={lastData} />
      </div>
      
      <div className="text-md text-slate-600 flex items-center pt-5">
        <Clock className="mr-2 h-4 w-4" />
        Última Actualización: {dashboardData.lastUpdate}
      </div>
    </div>
  );
});

const ChartCard = React.memo(({ data, dataKey, name, unit, threshold, color }) => (
  <div className="bg-white shadow-lg rounded-xl p-4 md:p-6">
    <h3 className="font-semibold text-slate-700 mb-4">{`${name} (${unit})`}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart 
        data={data} 
        syncId="sensorCharts" 
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis 
          dataKey="time" 
          stroke="#94a3b8" 
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickFormatter={(value) => formatValue(value)}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(5px)',
            border: '1px solid #e0e0e0',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          formatter={(value) => [formatValue(value), name]}
          labelStyle={{ color: '#475569' }}
        />
        <Legend />
        {threshold && (
          <ReferenceLine 
            y={threshold} 
            label={{ value: "Límite", position: "topRight" }}
            stroke="#ef4444" 
            strokeDasharray="5 5"
          />
        )}
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          name={name} 
          stroke={color} 
          strokeWidth={2} 
          dot={false} 
          activeDot={{ r: 6, strokeWidth: 2, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
));

const ChartsView = React.memo(({ history }) => {
  const chartConfigs = useMemo(() => [
    { 
      dataKey: "pressure", 
      name: "Presión", 
      unit: "bar", 
      threshold: CONSTANTS.THRESHOLDS.pressure, 
      color: CONSTANTS.COLORS.sky 
    },
    { 
      dataKey: "flow", 
      name: "Caudal", 
      unit: "L/min", 
      threshold: CONSTANTS.THRESHOLDS.flow, 
      color: CONSTANTS.COLORS.green 
    },
    { 
      dataKey: "rssi", 
      name: "Señal (RSSI)", 
      unit: "dBm", 
      threshold: null, 
      color: CONSTANTS.COLORS.rose 
    }
  ], []);

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Gráficas Históricas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfigs.map((config, index) => (
          <div key={config.dataKey} className={index === 2 ? "lg:col-span-2" : ""}>
            <ChartCard data={history} {...config} />
          </div>
        ))}
      </div>
    </div>
  );
});

// Main App Component
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const { lastData, history, loading, error } = useFirebaseData();
  const { isMobileMenuOpen, openMenu, closeMenu } = useMobileMenu();

  // Add fade-in animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (error) {
    return (
      <div className="flex h-screen bg-slate-100 font-sans">
        <ErrorBoundary error={error} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        lastData={lastData}
        isMobileOpen={isMobileMenuOpen}
        onClose={closeMenu}
      /> 
      <div className="flex flex-col flex-1 w-full">
        <MobileHeader onMenuClick={openMenu} />
        
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeView === 'dashboard' && <DashboardView lastData={lastData} />}
              {activeView === 'charts' && <ChartsView history={history} />}
            </>
          )}
        </main>
      </div>
       <Analytics />
      <SpeedInsights />
    </div>
  );
}