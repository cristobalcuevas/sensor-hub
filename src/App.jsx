import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, ReferenceLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Droplet, Gauge, Waves, Wifi, Battery, Activity, CircuitBoard, Clock, AlertTriangle, Menu, X, MapPin,
  Factory, Thermometer, ThermometerSun, CloudSun, Wind, CloudRain, Compass } from 'lucide-react';

import { ref, onValue } from "firebase/database";
import { db } from "./firebase.js";

const CONSTANTS = {
  DEVICE_NAME: 'iaGlobal',
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
    orange: '#f97316',
    amber: '#f59e0b',
  },

    AMBIENT_WEATHER: {
    API_KEY: import.meta.env.VITE_AW_API_KEY,
    APPLICATION_KEY: import.meta.env.VITE_AW_APPLICATION_KEY,
    MAC_ADDRESS: import.meta.env.VITE_AW_MAC_ADDRESS,
  },

  UBIDOTS_PLANTS: [
    {
      id: 'planta_el_volcan',
      name: 'Planta El Volcán',
      sensors: [
        {
          id: 'volcan_presion',
          name: 'iag002',
          token: import.meta.env.VITE_UBIDOTS_VOLCAN_TOKEN_PRESION,
          variables: {
            pressure: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_PRESION, name: 'Presión', unit: 'bar', icon: Gauge, color: 'sky' },
          }
        },
        {
          id: 'volcan_caudal_entrada',
          name: 'pulsos-03',
          token: import.meta.env.VITE_UBIDOTS_VOLCAN_TOKEN_ENTRADA,
          variables: {
            flow: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_CAUDAL_ENTRADA, name: 'Caudal', unit: 'L/min', icon: Waves, color: 'green' },
            temperature: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_TEMPERATURA_ENTRADA, name: 'Temperatura', unit: '°C', icon: Thermometer, color: 'amber' },
            humidity: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_HUMEDAD_ENTRADA, name: 'Humedad', unit: '%', icon: ThermometerSun, color: 'orange' },
          }
        },
        {
          id: 'volcan_caudal_salida',
          name: 'pulsos-04',
          token: import.meta.env.VITE_UBIDOTS_VOLCAN_TOKEN_SALIDA,
          variables: {
            flow_out: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_CAUDAL_SALIDA, name: 'Caudal', unit: 'L/min', icon: Waves, color: 'green' },
            temperature_out: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_TEMPERATURA_SALIDA, name: 'Temperatura', unit: '°C', icon: Thermometer, color: 'amber' },
            humidity_out: { id: import.meta.env.VITE_UBIDOTS_VOLCAN_HUMEDAD_SALIDA, name: 'Humedad', unit: '%', icon: ThermometerSun, color: 'orange' },
          }
        }
      ]
    },
    {
      id: 'planta_candelaria',
      name: 'Planta Candelaria',
      sensors: [
        {
          id: 'candelaria_presion',
          name: 'iag001',
          token: import.meta.env.VITE_UBIDOTS_CANDELARIA_TOKEN_PRESION,
          variables: {
            pressure: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_PRESION, name: 'Presión', unit: 'bar', icon: Gauge, color: 'sky' },
          }
        },
        {
          id: 'candelaria_caudal_entrada',
          name: 'pulsos-01',
          token: import.meta.env.VITE_UBIDOTS_CANDELARIA_TOKEN_ENTRADA,
          variables: {
            flow: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_CAUDAL_ENTRADA, name: 'Caudal', unit: 'L/min', icon: Waves, color: 'green' },
            temperature: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_TEMPERATURA_ENTRADA, name: 'Temperatura', unit: '°C', icon: Thermometer, color: 'amber' },
            humidity: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_HUMEDAD_ENTRADA, name: 'Humedad', unit: '%', icon: ThermometerSun, color: 'orange' },
          }
        },
        {
          id: 'candelaria_caudal_salida',
          name: 'pulsos-02',
          token: import.meta.env.VITE_UBIDOTS_CANDELARIA_TOKEN_SALIDA,
          variables: {
            flow_out: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_CAUDAL_SALIDA, name: 'Caudal', unit: 'L/min', icon: Waves, color: 'green' },
            temperature_out: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_TEMPERATURA_SALIDA, name: 'Temperatura', unit: '°C', icon: Thermometer, color: 'amber' },
            humidity_out: { id: import.meta.env.VITE_UBIDOTS_CANDELARIA_HUMEDAD_SALIDA, name: 'Humedad', unit: '%', icon: ThermometerSun, color: 'orange' },
          }
        }
      ]
    }
  ]
};


const NAV_ITEMS = [
  { id: 'firebase', label: 'Maqueta', icon: CircuitBoard },
  { id: 'ubidots', label: 'Puntos de Medición', icon: Factory },
  { id: 'weather', label: 'Estación Met.', icon: CloudSun }
];

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

const useUbidotsData = (plantId) => {
  const [data, setData] = useState({ latestValues: {}, history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plantId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData({ latestValues: {}, history: [] });

      const plantConfig = CONSTANTS.UBIDOTS_PLANTS.find(p => p.id === plantId);
      if (!plantConfig || !plantConfig.sensors) {
        setError("Configuración de planta o sensores no encontrada.");
        setLoading(false);
        return;
      }

      try {
        const end = Date.now();
        const start = end - 24 * 60 * 60 * 1000;

        // --- 1. OBTENER ÚLTIMOS VALORES (Sin cambios) ---
        let latestValuesPromises = [];
        plantConfig.sensors.forEach(sensor => {
          Object.keys(sensor.variables).forEach(key => {
            const varId = sensor.variables[key].id;
            latestValuesPromises.push(
              fetch(`https://industrial.api.ubidots.com/api/v1.6/variables/${varId}/values/?page_size=1`, {
                headers: { 'X-Auth-Token': sensor.token }
              }).then(res => res.json())
            );
          });
        });
        const latestValuesResults = await Promise.all(latestValuesPromises);
        const latestValues = {};
        let i = 0;
        plantConfig.sensors.forEach(sensor => {
          Object.keys(sensor.variables).forEach(key => {
            latestValues[key] = latestValuesResults[i]?.results?.[0]?.value ?? 'N/A';
            i++;
          });
        });

        // --- 2. OBTENER HISTORIAL ---
        let historyPromises = [];
        // Guardaremos las claves en el mismo orden que los IDs para mapear la respuesta
        const sensorVariableKeys = [];

        plantConfig.sensors.forEach(sensor => {
          const variableIdsForSensor = [];
          const keysForSensor = [];
          Object.entries(sensor.variables).forEach(([key, config]) => {
            variableIdsForSensor.push(config.id);
            keysForSensor.push(key);
          });
          sensorVariableKeys.push(keysForSensor);

          if (variableIdsForSensor.length > 0) {
            // ✨ CAMBIO 1: Usamos el body que SÍ funciona, igual a tu curl.
            const body = {
              variables: variableIdsForSensor,
              columns: ["value.value", "timestamp"],
              join_dataframes: false,
              start: start,
              end: end,
            };

            historyPromises.push(
              fetch('https://industrial.api.ubidots.com/api/v1.6/data/raw/series', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Token': sensor.token },
                body: JSON.stringify(body),
              }).then(res => res.json())
            );
          }
        });

        const historyResultsFromSensors = await Promise.all(historyPromises);
        console.log("Respuesta CRUDA de Ubidots para el historial:", historyResultsFromSensors);

        // --- 3. PROCESAR LA RESPUESTA ---
        const unifiedHistory = {};
        historyResultsFromSensors.forEach((sensorData, sensorIndex) => {
          // ✨ CAMBIO 2: Leemos la estructura correcta: response.results[variableIndex]
          if (sensorData && Array.isArray(sensorData.results)) {
            sensorData.results.forEach((variableDataSet, variableIndex) => {
              const key = sensorVariableKeys[sensorIndex][variableIndex];
              if (key && Array.isArray(variableDataSet)) {
                variableDataSet.forEach(([value, timestamp]) => {
                  if (timestamp != null && value != null) {
                    if (!unifiedHistory[timestamp]) {
                      unifiedHistory[timestamp] = {
                        timestamp: timestamp,
                        time: new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                      };
                    }
                    unifiedHistory[timestamp][key] = value;
                  }
                });
              }
            });
          }
        });

        const history = Object.values(unifiedHistory).sort((a, b) => a.timestamp - b.timestamp);
        console.log("Arreglo de 'history' FINAL para los gráficos:", history);

        setData({ latestValues, history });

      } catch (err) {
        setError('Error al obtener datos de Ubidots: ' + err.message);
        console.error("Ubidots API error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [plantId]);

  return { data, loading, error };
};

const useAmbientWeatherData = () => {
  const [data, setData] = useState({ latest: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✨ 1. Usamos una 'ref' para controlar si ya se está haciendo una petición.
  // Esto evita las llamadas duplicadas del modo estricto de React.
  const isFetching = React.useRef(false);

  React.useEffect(() => {
    const fetchData = async () => {
      // Si ya hay una petición en curso, no hacemos nada.
      if (isFetching.current) return;

      // Marcamos que la petición va a comenzar.
      isFetching.current = true;
      
      // Mantenemos el 'loading' solo en la primera carga.
      // En las siguientes, los datos se refrescarán en segundo plano.
      if (!data.latest) {
          setLoading(true);
      }
      setError(null);

      const { API_KEY, APPLICATION_KEY, MAC_ADDRESS } = CONSTANTS.AMBIENT_WEATHER;

      if (!APPLICATION_KEY || !MAC_ADDRESS || APPLICATION_KEY === 'TU_APPLICATION_KEY_AQUI') {
        setError("Por favor, configura tu Application Key y MAC Address en las constantes.");
        setLoading(false);
        isFetching.current = false;
        return;
      }

      try {
        const url = `https://api.ambientweather.net/v1/devices/${MAC_ADDRESS}?apiKey=${API_KEY}&applicationKey=${APPLICATION_KEY}&limit=288`;
        const response = await fetch(url);

        if (!response.ok) {
           const errorBody = await response.json();
           throw new Error(`Error de la API: ${response.status} - ${errorBody.message || response.statusText}`);
        }

        const historyData = await response.json();

        if (historyData.length > 0) {
          const latest = historyData[0];
          const history = historyData.map(d => ({
            ...d,
            tempc: (d.tempf - 32) * 5 / 9,
            baromrelhpa: d.baromrelin * 33.8639,
            windspeedkmh: d.windspeedmph * 1.60934,
            dailyrainmm: d.dailyrainin * 25.4,
            timestamp: new Date(d.dateutc).getTime(),
            time: new Date(d.dateutc).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          })).sort((a, b) => a.timestamp - b.timestamp);
          setData({ latest: history[history.length - 1], history });
        } else {
          setError("No se recibió historial de la estación. Verifica la MAC Address y las Keys.");
        }
      } catch (err) {
        setError('Error al obtener datos de Ambient Weather: ' + err.message);
        console.error("Ambient Weather API error:", err);
      } finally {
        // Marcamos que la petición ha terminado.
        isFetching.current = false;
        setLoading(false);
      }
    };

    fetchData();

    // ✨ 2. Usamos 'setTimeout' en lugar de 'setInterval' para más control.
    // Esto agenda la próxima llamada 5 minutos DESPUÉS de que la actual termine.
    const timerId = setTimeout(() => {
        const intervalId = setInterval(fetchData, 300000); // 300000 ms = 5 minutos
        return () => clearInterval(intervalId);
    }, 300000);

    return () => clearTimeout(timerId);

  }, []); // El array vacío asegura que esto se configure solo una vez.

  return { data, loading, error };
};

const useMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
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
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
};

const Sidebar = React.memo(({ activeView, setActiveView, lastData, isMobileOpen, onClose }) => {
  const handleNavClick = useCallback((viewId) => {
    setActiveView(viewId);
    onClose();
  }, [setActiveView, onClose]);

  const deviceName = lastData?.device || CONSTANTS.DEVICE_NAME;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-800 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:flex ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="p-6 text-center border-b border-slate-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-400 flex items-center">
            <Droplet className="mr-2" aria-hidden="true" />
            {CONSTANTS.DEVICE_NAME}
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
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${activeView === item.id
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

const MobileHeader = React.memo(({ onMenuClick }) => {
  return (
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
  )
});

const DashboardCard = React.memo(({ icon: Icon, title, value, unit, color, bgColor }) => {
  return (
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
  )
});

const ChartCard = React.memo(({ data, dataKey, name, unit, threshold, color }) => (
  <div className="bg-white shadow-lg rounded-xl p-4 md:p-6">
    <h3 className="font-semibold text-slate-700 mb-4">{`${name} (${unit})`}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 25, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          label={{value: 'Time', offset: 30, fill: '#64748b', fontSize: 12}}
          dataKey="time"
          stroke="#94a3b8"
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          label={{value: `${name} (${unit})`, angle: -90, position: 'center', offset: -5, fill: '#64748b', fontSize: 12}}
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
          formatter={(value, name, props) => [formatValue(value), props.payload.name]}
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
          connectNulls={true}
        />
      </LineChart>
    </ResponsiveContainer>
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

const ErrorBoundary = ({ error }) => {
  return (
    <div className="p-4 md:p-8 flex justify-center items-center h-full">
      <div className="text-center bg-white p-10 rounded-xl shadow-lg max-w-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-2xl font-semibold text-slate-700">Error</h2>
        <p className="text-slate-500 mt-2">{error}</p>
      </div>
    </div>
  )
};

const LoadingState = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
        <div className="text-xl font-semibold text-slate-600">Cargando datos...</div>
      </div>
    </div>
  )
};

const FirebaseView = () => {
  const { lastData, history, loading, error } = useFirebaseData();

  if (loading) return <LoadingState />;
  if (error) return <ErrorBoundary error={error} />;

  if (!lastData) {
    return (
      <div className="p-4 md:p-8 flex justify-center items-center h-full">
        <div className="text-center bg-white p-10 rounded-xl shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-700">No se encontraron datos de Firebase</h2>
          <p className="text-slate-500 mt-2 max-w-md">
            Asegúrate de que tu base de datos tenga datos en la ruta "ejemplo".
          </p>
        </div>
      </div>
    );
  }

  const dashboardCards = [
      { icon: Gauge, title: "Presión", value: formatValue(lastData.pressure), unit: "bar", color: "text-sky-500", bgColor: "bg-sky-100" },
      { icon: Waves, title: "Caudal", value: formatValue(lastData.flow), unit: "L/min", color: "text-green-500", bgColor: "bg-green-100" },
      { icon: Wifi, title: "Señal (RSSI)", value: lastData.rssi, unit: "dBm", color: "text-rose-500", bgColor: "bg-rose-100" },
      { icon: Battery, title: "Voltaje", value: "5.00", unit: "V", color: "text-violet-500", bgColor: "bg-violet-100" },
      { icon: Activity, title: "Activo", value: calculateActivity(lastData.elapsed_time_us), unit: "min", color: "text-orange-500", bgColor: "bg-orange-100" }
  ];

  const chartConfigs = [
    { dataKey: "pressure", name: "Presión", unit: "bar", threshold: CONSTANTS.THRESHOLDS.pressure, color: CONSTANTS.COLORS.sky },
    { dataKey: "flow", name: "Caudal", unit: "L/min", threshold: CONSTANTS.THRESHOLDS.flow, color: CONSTANTS.COLORS.green },
    { dataKey: "rssi", name: "Señal (RSSI)", unit: "dBm", threshold: null, color: CONSTANTS.COLORS.rose }
  ];

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* SECCIÓN DEL DASHBOARD */}
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Maqueta</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {dashboardCards.map((card, index) => <DashboardCard key={index} {...card} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 mb-8">
        <MapCard position={CONSTANTS.SENSOR_LOCATION} deviceData={lastData} />
      </div>

      {/* SECCIÓN DE GRÁFICOS */}
      <h3 className="text-2xl font-semibold text-slate-700 mb-4 mt-8 border-b-2 border-slate-300 pb-2">Gráficas Históricas</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfigs.map((config, index) => (
          <div key={config.dataKey} className={index === 2 ? "lg:col-span-2" : ""}>
            <ChartCard data={history} {...config} />
          </div>
        ))}
      </div>
      
      <div className="text-md text-slate-600 flex items-center pt-5">
        <Clock className="mr-2 h-4 w-4" />
        Última Actualización: {formatTimestamp(lastData.timestamp)}
      </div>
    </div>
  );
};

const UbidotsView = () => {
  const [selectedPlant, setSelectedPlant] = useState(CONSTANTS.UBIDOTS_PLANTS[0]?.id);
  const { data, loading, error } = useUbidotsData(selectedPlant);

  const plantConfig = CONSTANTS.UBIDOTS_PLANTS.find(p => p.id === selectedPlant);

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorBoundary error={error} />;
    if (!plantConfig) return <ErrorBoundary error="Planta no encontrada." />;

    return (
      <>
        {/* Iterar sobre cada sensor para mostrar sus tarjetas */}
        {plantConfig.sensors.map(sensor => (
          <div key={sensor.id} className="mb-10">
            <h3 className="text-2xl font-semibold text-slate-700 mb-4 border-b-2 border-sky-200 pb-2">{sensor.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(sensor.variables).map(([key, config]) => (
                <DashboardCard
                  key={key}
                  icon={config.icon}
                  title={config.name}
                  value={formatValue(data.latestValues[key])}
                  unit={config.unit}
                  color={`text-${config.color}-500`}
                  bgColor={`bg-${config.color}-100`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Gráficos con el historial de todas las variables */}
        <h3 className="text-2xl font-semibold text-slate-700 mb-4 mt-8 border-b-2 border-slate-300 pb-2">Gráficas Históricas (Últimas 24h)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plantConfig.sensors.flatMap(sensor =>
            Object.entries(sensor.variables).map(([key, config]) => (
              <ChartCard
                key={key}
                data={data.history}
                dataKey={key}
                name={`${config.name} ${sensor.name}`}
                unit={config.unit}
                color={CONSTANTS.COLORS[config.color]}
                threshold={null}
              />
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Puntos de Medición</h2>
        <select
          id="plant-select"
          value={selectedPlant}
          onChange={(e) => setSelectedPlant(e.target.value)}
          className="mt-2 md:mt-0 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 w-full md:w-auto"
        >
          {CONSTANTS.UBIDOTS_PLANTS.map(plant => (
            <option key={plant.id} value={plant.id}>{plant.name}</option>
          ))}
        </select>
      </div>

      {renderContent()}
    </div>
  );
};

const WeatherView = () => {
  const { data, loading, error } = useAmbientWeatherData();

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorBoundary error={error} />;
    if (!data.latest) return <ErrorBoundary error="No se encontraron datos recientes de la estación." />;

    const { latest, history } = data;

    // Tarjetas para los datos más recientes
    const weatherCards = [
      { icon: Thermometer, title: "Temperatura Exterior", value: formatValue(latest.tempc, 1), unit: "°C", color: "text-orange-500", bgColor: "bg-orange-100" },
      { icon: ThermometerSun, title: "Humedad Exterior", value: formatValue(latest.humidity, 0), unit: "%", color: "text-sky-500", bgColor: "bg-sky-100" },
      { icon: Gauge, title: "Presión relativa", value: formatValue(latest.baromrelhpa, 0), unit: "hPa", color: "text-violet-500", bgColor: "bg-violet-100" },
      { icon: CloudRain, title: "Precipitación diarias", value: formatValue(latest.dailyrainmm, 1), unit: "mm", color: "text-blue-500", bgColor: "bg-blue-100" },
      { icon: Wind, title: "Velocidad del viento", value: formatValue(latest.windspeedkmh, 1), unit: "km/h", color: "text-green-500", bgColor: "bg-green-100" },
      { icon: Compass, title: "Dirección del viento", value: latest.winddir, unit: "°", color: "text-cyan-500", bgColor: "bg-cyan-100" },
    ];

    // Configuración para los gráficos
    const chartConfigs = [
       { dataKey: "tempc", name: "Temperatura", unit: "°C", color: CONSTANTS.COLORS.orange },
       { dataKey: "humidity", name: "Humedad", unit: "%", color: CONSTANTS.COLORS.sky },
        { dataKey: "baromrelhpa", name: "Presión relativa", unit: "hPa", color: CONSTANTS.COLORS.violet },
        { dataKey: "windspeedkmh", name: "Velocidad del Viento", unit: "km/h", color: CONSTANTS.COLORS.green },
        { dataKey: "dailyrainmm", name: "Precipitación diarias", unit: "mm", color: CONSTANTS.COLORS.blue },
    ];


    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {weatherCards.map(card => <DashboardCard key={card.title} {...card} />)}
        </div>
        
        <h3 className="text-2xl font-semibold text-slate-700 mb-4 mt-8 border-b-2 border-slate-300 pb-2">Gráficas Históricas (Últimas 24h)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartConfigs.map(config => (
            <ChartCard
              key={config.dataKey}
              data={history}
              dataKey={config.dataKey}
              name={config.name}
              unit={config.unit}
              color={config.color}
            />
          ))}
        </div>
         <div className="text-md text-slate-600 flex items-center pt-5">
            <Clock className="mr-2 h-4 w-4" />
            Última Actualización: {new Date(latest.date).toLocaleString('es-ES')}
        </div>
      </>
    );
  };
  
  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Estación Meteorológica </h2>
      {renderContent()}
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState('firebase');
  const { isMobileMenuOpen, openMenu, closeMenu } = useMobileMenu();

  React.useEffect(() => {
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileOpen={isMobileMenuOpen}
        onClose={closeMenu}
      />
      <div className="flex flex-col flex-1 w-full">
        <MobileHeader onMenuClick={openMenu} />

        <main className="flex-1 overflow-y-auto">
          {activeView === 'firebase' && <FirebaseView />}
          {activeView === 'ubidots' && <UbidotsView />}
          {activeView === 'weather' && <WeatherView />}
        </main>
      </div>
    </div>
  );
}