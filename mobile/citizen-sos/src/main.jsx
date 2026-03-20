import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Shield, MapPin, Phone, User, Activity, Bell, AlertTriangle, Navigation, ChevronRight, Heart, Zap, Thermometer, Droplets, Wind } from 'lucide-react';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';
const socket = io(BACKEND_URL);

// Premium "Real-Life" Icons
const userIcon = L.divIcon({
    className: 'user-icon',
    html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div>
      <div class="absolute w-8 h-8 bg-blue-500/40 rounded-full animate-pulse"></div>
      <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.6)] z-10"></div>
    </div>
  `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const ambulanceIcon = L.divIcon({
    className: 'amb-icon',
    html: `
    <div class="relative">
        <div class="absolute -inset-1 bg-white/20 rounded-lg blur-sm"></div>
        <div class="bg-red-600 p-2 rounded-lg shadow-2xl border-2 border-white/30 flex items-center justify-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1/2 bg-white/20"></div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" class="drop-shadow-lg">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
            </svg>
            <div class="absolute -top-1 -right-1 flex gap-0.5">
                <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                <div class="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    </div>
  `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
});

const hospitalIcon = L.divIcon({
    className: 'hosp-icon',
    html: `
    <div class="relative group">
      <div class="absolute -inset-2 bg-slate-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="bg-slate-900 border-2 border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-xl relative">
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 fill-red-500/20"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
    </div>
  `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const MapAutoCenter = ({ userCoords, ambCoords }) => {
    const map = useMap();
    useEffect(() => {
        if (userCoords && ambCoords) {
            const bounds = L.latLngBounds([
                [userCoords.lat, userCoords.lng],
                [ambCoords.lat, ambCoords.lng]
            ]);
            map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 1.5 });
        } else if (userCoords) {
            map.setView([userCoords.lat, userCoords.lng], 15);
        }
    }, [userCoords, ambCoords, map]);
    return null;
};

const HealthStat = ({ icon: Icon, label, value, color }) => (
    <div className="glass p-5 rounded-[2rem] border-slate-800/40 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 ${color.replace('text-', 'bg-')}/10`}>
            <Icon size={18} className={color} />
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-black text-slate-200">{value}</p>
        </div>
    </div>
);

const SlideToSOS = ({ onConfirm }) => {
    const [sliderPos, setSliderPos] = useState(0);
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    const handleStart = () => { isDragging.current = true; };
    const handleMove = (e) => {
        if (!isDragging.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        let pos = ((clientX - rect.left - 30) / (rect.width - 80)) * 100;
        pos = Math.max(0, Math.min(pos, 100));
        setSliderPos(pos);
        if (pos > 95) {
            isDragging.current = false;
            setSliderPos(100);
            onConfirm();
        }
    };
    const handleEnd = () => {
        if (sliderPos < 95) setSliderPos(0);
        isDragging.current = false;
    };

    return (
        <div
            ref={containerRef}
            className="h-20 bg-slate-900/60 rounded-[2.5rem] border border-slate-800 relative overflow-hidden flex items-center p-2 touch-none select-none"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-2">
                    Slide to trigger SOS <ChevronRight size={12} className="animate-pulse" />
                </span>
            </div>
            <div
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className="w-16 h-16 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] relative z-10 cursor-grab active:cursor-grabbing transition-transform active:scale-95"
                style={{ transform: `translateX(${sliderPos * (containerRef.current?.offsetWidth / 100 - 0.7) || 0}px)` }}
            >
                <div className="absolute inset-2 border-2 border-white/20 rounded-2xl"></div>
                <AlertTriangle size={24} className="text-white" />
            </div>
        </div>
    );
};

const App = () => {
    const [step, setStep] = useState('register'); // register, dashboard, sos_active
    const [user, setUser] = useState({
        name: '', phone: '', spo2: '', heartRate: '', bloodGroup: '', bloodPressure: '', city: '', state: ''
    });
    const [userLocation, setUserLocation] = useState(null);
    const [incidentId, setIncidentId] = useState(null);
    const [incidentStatus, setIncidentStatus] = useState('pending');
    const [assignedAmbulance, setAssignedAmbulance] = useState(null);
    const [hospitals, setHospitals] = useState([]);

    useEffect(() => {
        socket.on('ambulance_assigned', (data) => {
            if (data.incidentId === incidentId) {
                setAssignedAmbulance(data.ambulance);
                setIncidentStatus('enroute');
            }
        });

        socket.on('ambulance_status_update', (data) => {
            if (assignedAmbulance && data.ambId === assignedAmbulance.id) {
                setIncidentStatus(data.status);
            }
        });

        socket.on('all_ambulances_update', (data) => {
            if (assignedAmbulance) {
                const updated = data.find(a => a.id === assignedAmbulance.id);
                if (updated) setAssignedAmbulance(updated);
            }
        });

        socket.on('hospitals_update', (data) => {
            setHospitals(data);
        });

        if (socket.connected) {
            socket.emit('request_initial_state');
        }

        socket.on('connect', () => {
            socket.emit('request_initial_state');
        });

        const savedUser = localStorage.getItem('eros_citizen_profile');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
            if (step === 'register') setStep('dashboard');
        }

        return () => {
            socket.off('ambulance_assigned');
            socket.off('ambulance_status_update');
            socket.off('all_ambulances_update');
            socket.off('hospitals_update');
        };
    }, [incidentId, assignedAmbulance, step]);


    const handleRegister = (e) => {
        e.preventDefault();
        localStorage.setItem('eros_citizen_profile', JSON.stringify(user));
        setStep('dashboard');
    };

    const triggerSOS = async () => {
        const cities = [
            { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
            { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            { name: 'Bangalore', lat: 12.9716, lng: 77.5946 }
        ];
        const defaultCity = cities[Math.floor(Math.random() * cities.length)];

        const submitSOS = async (lat, lng, cityName) => {
            const location = { lat, lng, city: cityName };
            setUserLocation(location);
            try {
                const resp = await fetch(`${BACKEND_URL}/api/sos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        citizenId: user.phone,
                        userProfile: user,
                        location,
                        city: cityName,
                        type: 'Critical Medical Alert'
                    })
                });
                const data = await resp.json();
                if (data.success) {
                    setIncidentId(data.id);
                    setStep('sos_active');
                }
            } catch (err) {
                console.error('SOS Trigger failed', err);
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => submitSOS(pos.coords.latitude, pos.coords.longitude, "Live Location"),
                () => submitSOS(defaultCity.lat, defaultCity.lng, defaultCity.name),
                { enableHighAccuracy: true }
            );
        } else {
            submitSOS(defaultCity.lat, defaultCity.lng, defaultCity.name);
        }
    };

    if (step === 'register') {
        return (
            <div className="min-h-screen p-8 flex flex-col justify-center bg-slate-950 text-white">
                <div className="relative mb-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Shield size={44} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-black mt-6">EROS</h1>
                </div>

                <div className="glass p-8 rounded-[3rem] border-slate-800/60 shadow-2xl">
                    <form onSubmit={handleRegister} className="space-y-6">
                        <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Full Name" />
                        <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.phone} onChange={e => setUser({ ...user, phone: e.target.value })} placeholder="Phone Number" />
                        <div className="grid grid-cols-2 gap-4">
                            <input required type="number" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.spo2} onChange={e => setUser({ ...user, spo2: e.target.value })} placeholder="SpO2 (%)" />
                            <input required type="number" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.heartRate} onChange={e => setUser({ ...user, heartRate: e.target.value })} placeholder="Heart Rate" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.bloodGroup} onChange={e => setUser({ ...user, bloodGroup: e.target.value })} placeholder="Blood Group" />
                            <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.bloodPressure} onChange={e => setUser({ ...user, bloodPressure: e.target.value })} placeholder="BP (e.g. 120/80)" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" value={user.city} onChange={e => setUser({ ...user, city: e.target.value })} placeholder="City" />
                            <select required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-slate-300" value={user.state} onChange={e => setUser({ ...user, state: e.target.value })}>
                                <option value="" disabled>Select State</option>
                                <option value="Andhra Pradesh">Andhra Pradesh</option>
                                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                <option value="Assam">Assam</option>
                                <option value="Bihar">Bihar</option>
                                <option value="Chhattisgarh">Chhattisgarh</option>
                                <option value="Goa">Goa</option>
                                <option value="Gujarat">Gujarat</option>
                                <option value="Haryana">Haryana</option>
                                <option value="Himachal Pradesh">Himachal Pradesh</option>
                                <option value="Jharkhand">Jharkhand</option>
                                <option value="Karnataka">Karnataka</option>
                                <option value="Kerala">Kerala</option>
                                <option value="Madhya Pradesh">Madhya Pradesh</option>
                                <option value="Maharashtra">Maharashtra</option>
                                <option value="Manipur">Manipur</option>
                                <option value="Meghalaya">Meghalaya</option>
                                <option value="Mizoram">Mizoram</option>
                                <option value="Nagaland">Nagaland</option>
                                <option value="Odisha">Odisha</option>
                                <option value="Punjab">Punjab</option>
                                <option value="Rajasthan">Rajasthan</option>
                                <option value="Sikkim">Sikkim</option>
                                <option value="Tamil Nadu">Tamil Nadu</option>
                                <option value="Telangana">Telangana</option>
                                <option value="Tripura">Tripura</option>
                                <option value="Uttar Pradesh">Uttar Pradesh</option>
                                <option value="Uttarakhand">Uttarakhand</option>
                                <option value="West Bengal">West Bengal</option>
                            </select>
                        </div>
                        <button className="w-full bg-red-600 font-black py-5 rounded-2xl shadow-xl">SAVE IDENTITY</button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 'dashboard') {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 space-y-10">
                <header className="flex justify-between items-start">
                    <h1 className="text-3xl font-black">{user.name.split(' ')[0]}</h1>
                    <div className="w-12 h-12 rounded-full border-2 border-slate-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" />
                    </div>
                </header>

                <div className="glass p-8 rounded-[3rem] border-slate-800/40">
                    <div className="flex gap-10 items-center">
                        <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center border-4 border-red-600/20 text-3xl font-black text-red-500">
                            {user.bloodGroup || 'O+'}
                        </div>
                        <div className="flex-1 space-y-4">
                            <p className="text-sm font-bold text-slate-300">Heart Rate: {user.heartRate || '72'} bpm</p>
                            <p className="text-sm font-bold text-slate-300">SpO2: {user.spo2 || '98'}%</p>
                            <p className="text-sm font-bold text-slate-300">BP: {user.bloodPressure || '120/80'}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-12">
                    <SlideToSOS onConfirm={triggerSOS} />
                </div>
            </div>
        );
    }

    if (step === 'sos_active') {
        const isTransporting = incidentStatus === 'enroute_hospital' || incidentStatus === 'pickup';

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col text-white animate-in fade-in duration-1000 relative overflow-hidden">
                {/* Visual Overlays */}
                <div className="absolute inset-0 pointer-events-none z-[2000] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-red-600/5 to-transparent"></div>
                    <div className="scanline"></div>
                </div>

                <div className="relative flex-1">
                    <MapContainer
                        center={[userLocation?.lat || 20, userLocation?.lng || 78]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <MapAutoCenter
                            userCoords={userLocation}
                            ambCoords={assignedAmbulance?.location}
                        />
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; EROS Advanced Mapping'
                        />

                        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />}

                        {assignedAmbulance && (
                            <Marker
                                position={[assignedAmbulance.location.lat, assignedAmbulance.location.lng]}
                                icon={ambulanceIcon}
                            />
                        )}

                        {hospitals.filter(h => h.city === userLocation?.city).map(h => (
                            <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={hospitalIcon} />
                        ))}
                    </MapContainer>

                    {/* Elite Status HUD */}
                    <div className="absolute top-10 left-6 right-6 z-[1000] space-y-6">
                        <div className="glass p-5 rounded-[2.5rem] border-red-600/30 flex items-center justify-between shadow-2xl backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-red-500 italic">Emergency Matrix Active</span>
                                    <p className="text-[10px] font-bold text-slate-500">Live Satellite Response Link Wired</p>
                                </div>
                            </div>
                            <Zap size={20} className="text-red-600" />
                        </div>

                        {assignedAmbulance && (
                            <div className="glass p-8 rounded-[3.5rem] border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.6)] animate-in slide-in-from-top duration-1000 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                                            <Navigation className="text-white fill-white" size={28} />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Responding Unit</h4>
                                            <p className="text-3xl font-black italic">{assignedAmbulance.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isTransporting ? 'text-blue-500' : 'text-green-500'}`}>
                                            {incidentStatus === 'enroute_hospital' ? 'Hospital Transport' :
                                                incidentStatus === 'pickup' ? 'Ambulance On-Site' : 'High-Speed response'}
                                        </p>
                                        <p className="text-4xl font-black tabular-nums">
                                            {incidentStatus === 'pickup' ? 'LOADING' : (incidentStatus === 'enroute_hospital' ? '03:15' : '02:40')}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                                            <Activity size={18} className="text-red-500" />
                                        </div>
                                        <span className="text-sm font-bold leading-tight">
                                            {incidentStatus === 'enroute_hospital'
                                                ? 'Life-Support systems engaged for hospital transport'
                                                : 'Siren active. Unit clearing traffic for immediate arrival'}
                                        </span>
                                    </div>
                                    <div className="h-6 bg-slate-950 rounded-2xl p-1 border border-slate-900 relative overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r from-red-600 to-red-400 rounded-xl transition-all duration-[4000ms] shadow-[0_0_15px_rgba(220,38,38,0.5)] ${incidentStatus === 'pickup' ? 'w-1/2' : (incidentStatus === 'enroute_hospital' ? 'w-full' : 'w-1/4')
                                                }`}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[8px] font-black uppercase tracking-[0.5em] text-white/50">Mission Progress</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-12 left-6 right-6 z-[1000] space-y-4">
                        <button className="w-full bg-red-600 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(220,38,38,0.4)] transition-transform active:scale-95 group">
                            <Phone size={24} className="group-hover:animate-shake" /> CALL COORDINATOR
                        </button>
                    </div>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-3xl border-t border-slate-900 p-10 pb-16">
                    <button
                        onClick={() => {
                            if (window.confirm("ARE YOU SURE YOU WANT TO CANCEL? EMERGENCY SERVICES ARE ALREADY DISPATCHED.")) {
                                setStep('dashboard');
                                setIncidentId(null);
                                setAssignedAmbulance(null);
                            }
                        }}
                        className="w-full bg-slate-900 hover:bg-white/5 text-slate-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] border border-slate-800 transition-all"
                    >
                        ABORT RESCUE SIGNAL
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
