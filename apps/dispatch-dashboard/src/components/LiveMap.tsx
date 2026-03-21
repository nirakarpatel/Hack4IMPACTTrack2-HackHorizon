import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { socket } from '../lib/socket';

// Custom Ambulance Icon
const createAmbulanceIcon = (heading: number, status: string, type: string = 'Basic') => {
    let color = '#3b82f6'; // Basic - Blue
    if (type === 'ICU') color = '#ef4444'; // ICU - Red
    if (type === 'Advanced') color = '#eab308'; // Advanced - Yellow
    
    if (status !== 'available') color = '#ffffff';

    return L.divIcon({
        className: 'custom-div-icon',
        html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.8s linear;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="4" width="12" height="16" rx="2" stroke="${color}" stroke-width="2.5" fill="rgba(15, 23, 42, 0.9)"/>
          <path d="M6 8H18" stroke="${color}" stroke-width="1.5" />
          <path d="M12 11V15M10 13H14" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
          ${status !== 'available' ? `
          <circle cx="12" cy="6" r="1.5" fill="red">
            <animate attributeName="opacity" values="0;1;0" dur="0.4s" repeatCount="indefinite" />
          </circle>` : ''}
        </svg>
      </div>
    `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
};

// Custom Hospital Icon
const hospitalIcon = L.divIcon({
    className: 'hospital-icon',
    html: `
    <div class="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
      <span class="text-white font-black text-xs">H</span>
    </div>
  `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// SOS Icon with Name Label
const createSOSIcon = (name: string, status: string = 'pending') => {
    const isBlinking = status === 'pending' || status === 'dispatched';
    return L.divIcon({
        className: 'sos-icon',
        html: `
            <div class="relative flex flex-col items-center">
                <div class="absolute -top-10 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-2xl whitespace-nowrap border-2 border-white ${isBlinking ? 'animate-bounce' : ''}">
                    ${isBlinking ? name.split(' ')[0].toUpperCase() + ' NEEDED' : 'RESISTING PATIENT'}
                </div>
                <div class="relative">
                    ${isBlinking ? '<div class="absolute -inset-6 bg-red-500/30 rounded-full animate-ping"></div>' : ''}
                    <div class="w-5 h-5 bg-red-600 rounded-full border-2 border-white shadow-2xl pulse-red"></div>
                </div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

// Map auto-focus helper
const MapFlyTo = ({ coords }: { coords: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.flyTo(coords, 13, { duration: 2 });
        }
    }, [coords, map]);
    return null;
};

export default function LiveMap() {
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [activeSOS, setActiveSOS] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [latestIncidentLoc, setLatestIncidentLoc] = useState<[number, number] | null>(null);

    useEffect(() => {
        const handleAmbulances = (data: any[]) => {
            setAmbulances(data);
        };

        const handleHospitals = (data: any[]) => {
            setHospitals(data);
        };

        const handleNewEmergency = (data: any) => {
            setLatestIncidentLoc([data.location.lat, data.location.lng]);
        };

        const handlePending = (data: any[]) => {
            setActiveSOS(data);
        };

        const handleHistory = (data: any[]) => {
            setHistory(data);
        };

        const handleConnect = () => {
            socket.emit('request_initial_state');
        };

        if (socket.connected) {
            socket.emit('request_initial_state');
        }

        socket.on('connect', handleConnect);
        socket.on('all_ambulances_update', handleAmbulances);
        socket.on('hospitals_update', handleHospitals);
        socket.on('new_emergency', handleNewEmergency);
        socket.on('pending_incidents_update', handlePending);
        socket.on('history_update', handleHistory);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('all_ambulances_update', handleAmbulances);
            socket.off('hospitals_update', handleHospitals);
            socket.off('new_emergency', handleNewEmergency);
            socket.off('pending_incidents_update', handlePending);
            socket.off('history_update', handleHistory);
        };
    }, []);

    return (
        <div className="w-full h-full relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <MapFlyTo coords={latestIncidentLoc} />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />

                {/* Heatmap Simulation (Past Incidents) */}
                {showHeatmap && history.map((h, i) => (
                    <Circle
                        key={`heat-${i}`}
                        center={[h.location.lat, h.location.lng]}
                        radius={2000}
                        pathOptions={{ 
                            fillColor: '#ef4444', 
                            fillOpacity: 0.1, 
                            stroke: false 
                        }}
                    />
                ))}

                {/* Hospitals */}
                {hospitals.map(hosp => (
                    <Marker
                        key={hosp.id}
                        position={[hosp.location.lat, hosp.location.lng]}
                        icon={hospitalIcon}
                    />
                ))}

                {/* SOS Alerts */}
                {activeSOS.map(sos => (
                    <Marker
                        key={sos.id}
                        position={[sos.location.lat, sos.location.lng]}
                        icon={createSOSIcon(sos.userProfile?.name || 'Emergency', sos.status)}
                    />
                ))}

                {/* Lines between SOS and Assigned Ambulance / Hospital */}
                {activeSOS.map(sos => {
                    if (sos.status !== 'pending' && (sos.path || sos.ambulanceId)) {
                        const assignedAmb = ambulances.find(a => a.id === sos.ambulanceId);
                        if (assignedAmb) {
                            // Determine destination point
                            const isEnRouteHospital = sos.status === 'enroute_hospital' || sos.status === 'pickup';
                            const destination = isEnRouteHospital && sos.destinationLocation 
                                ? [sos.destinationLocation.lat, sos.destinationLocation.lng]
                                : [sos.location.lat, sos.location.lng];

                            // Generate a distinct color based on SOS ID
                            const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];
                            const colorIndex = Math.abs(sos.id.split('').reduce((a: any, b: any) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)) % colors.length;
                            const routeColor = colors[colorIndex];

                            // Use road path if available
                            const polylinePositions = sos.path && Array.isArray(sos.path)
                                ? sos.path.map((p: any) => [p.lat, p.lng])
                                : [
                                    [assignedAmb.location.lat, assignedAmb.location.lng],
                                    destination
                                ];

                            return (
                                <Polyline
                                    key={`line-${sos.id}`}
                                    positions={polylinePositions}
                                    pathOptions={{ 
                                        color: routeColor, 
                                        weight: 6,
                                        dashArray: undefined,
                                        opacity: 0.9,
                                        lineJoin: 'round',
                                        lineCap: 'round'
                                    }}
                                />
                            );
                        }
                    }
                    return null;
                })}

                {/* Ambulances */}
                {ambulances.map(amb => (
                    <Marker
                        key={amb.id}
                        position={[amb.location.lat, amb.location.lng]}
                        icon={createAmbulanceIcon(amb.heading || 0, amb.status, amb.type)}
                    >
                        <Popup>
                            <div className="bg-slate-900 text-white p-2 border border-slate-700 rounded-lg">
                                <p className="font-black text-blue-400">{amb.id}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{amb.type} UNIT</p>
                                <div className="space-y-1">
                                    <p className="text-xs flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${amb.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                        {amb.status.replace('_', ' ')}
                                    </p>
                                    <p className="text-[9px] text-slate-400">EQUIP: {amb.equipment?.join(', ')}</p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map Controls */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
                <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        showHeatmap ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-900/80 border-slate-700 text-slate-400'
                    }`}
                >
                    Heatmap {showHeatmap ? 'ON' : 'OFF'}
                </button>
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 z-10 bg-slate-950/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col gap-4 min-w-[200px]">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Fleet Legend</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rounded border border-white/20"></div>
                        <span className="text-[11px] font-bold text-slate-200">ICU / Life Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded border border-white/20"></div>
                        <span className="text-[11px] font-bold text-slate-200">Advanced Cardiac</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded border border-white/20"></div>
                        <span className="text-[11px] font-bold text-slate-200">Basic Unit</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                        <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Live Emergency</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
