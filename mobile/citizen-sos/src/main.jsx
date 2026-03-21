import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Shield, MapPin, Phone, User, Activity, Bell, AlertTriangle, Navigation, ChevronRight, Heart, Zap, Thermometer, Droplets, Wind, Pill, Calendar, Clock, Plus, CalendarPlus, Stethoscope, ChevronLeft, RefreshCcw, CheckCircle } from 'lucide-react';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
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
        <svg xmlns="http://www.w3.org/2000/svga" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 fill-red-500/20"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
    </div>
  `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};

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

const VitalsGraph = ({ sys, hr }) => {
    const [view, setView] = useState('weekly'); // daily, weekly, monthly

    const getHealthStatus = (s, h) => {
        if (s > 140 || s < 90 || h > 100 || h < 50) return { color: 'bg-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]', label: 'CRITICAL', text: 'text-red-500' };
        if (s > 130 || s < 100 || h > 90 || h < 60) return { color: 'bg-orange-500', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]', label: 'ATTENTION', text: 'text-orange-500' };
        if (s > 120 || h > 80) return { color: 'bg-yellow-500', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]', label: 'FAIR', text: 'text-yellow-500' };
        return { color: 'bg-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.5)]', label: 'OPTIMAL', text: 'text-green-500' };
    };

    const status = getHealthStatus(sys, hr);

    const dailyData = [
        { label: '12AM', val: hr - 10 }, { label: '4AM', val: hr - 8 }, { label: '8AM', val: hr - 2 },
        { label: '12PM', val: hr + 5 }, { label: '4PM', val: hr + 2 }, { label: '8PM', val: hr }
    ];

    const weeklyData = [
        { label: 'MON', val: hr - 5 }, { label: 'TUE', val: hr + 4 }, { label: 'WED', val: hr - 2 },
        { label: 'THU', val: hr + 6 }, { label: 'FRI', val: hr - 1 }, { label: 'SAT', val: hr + 2 }, { label: 'SUN', val: hr }
    ];

    const monthlyData = [
        { label: '1st', val: hr + 5 }, { label: '5th', val: hr - 3 }, { label: '10th', val: hr + 2 },
        { label: '15th', val: hr - 4 }, { label: '20th', val: hr + 6 }, { label: '25th', val: hr - 1 }, { label: '30th', val: hr }
    ];

    const currentData = view === 'daily' ? dailyData : view === 'weekly' ? weeklyData : monthlyData;

    return (
        <div className="glass p-6 rounded-[2rem] border-slate-800/60 mt-6 relative overflow-hidden group">
            <div className={`absolute -inset-10 bg-gradient-to-br from-transparent to-${status.color}/5 opacity-50 blur-xl transition-colors duration-1000`}></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Activity size={12} className={status.text} /> Vitals History</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-[8px] font-black ${status.color} text-white ${status.glow} uppercase tracking-widest mt-1`}>
                        {status.label} Status
                    </div>
                </div>

                <div className="flex bg-slate-900/80 rounded-full p-1 border border-slate-800">
                    {['daily', 'weekly', 'monthly'].map(t => (
                        <button
                            key={t}
                            onClick={() => setView(t)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${view === t ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-end justify-between h-36 gap-2 relative z-10 pt-4">
                {currentData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group/bar">
                        <div className="w-full bg-slate-900/80 rounded-t-xl relative h-full flex items-end overflow-hidden border-b border-slate-800">
                            <div
                                className={`w-full rounded-t-xl ${i === currentData.length - 1 ? status.color + ' ' + status.glow : 'bg-slate-700 group-hover/bar:bg-slate-600'} transition-all duration-700 ease-out`}
                                style={{ height: `${Math.min(100, Math.max(10, (d.val / 140) * 100))}%` }}
                            ></div>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider ${i === currentData.length - 1 ? 'text-white' : 'text-slate-500'}`}>
                            {d.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
    const [step, setStep] = useState('register'); // register, dashboard, sos_active, medicine, appointments
    const [user, setUser] = useState({
        name: '', phone: '', spo2: '', heartRate: '', bloodGroup: '', bloodPressure: '', city: '', state: '', medicines: [], appointments: []
    });

    const saveUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('eros_citizen_profile', JSON.stringify(updatedUser));
    };
    const [userLocation, setUserLocation] = useState(null);
    const [incidentId, setIncidentId] = useState(null);
    const [incidentStatus, setIncidentStatus] = useState('pending');
    const [assignedAmbulance, setAssignedAmbulance] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [emergencyDescription, setEmergencyDescription] = useState('');
    const [triageResult, setTriageResult] = useState(null);
    const [isTriaging, setIsTriaging] = useState(false);
    const [hasArrived, setHasArrived] = useState(false);

    useEffect(() => {
        if (assignedAmbulance && userLocation) {
            const dist = calculateDistance(
                userLocation.lat, userLocation.lng,
                assignedAmbulance.location.lat, assignedAmbulance.location.lng
            );
            
            if (dist < 50 || incidentStatus === 'arrived') {
                if (!hasArrived && step === 'sos_active') {
                    setHasArrived(true);
                    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500, 200, 800]);
                    
                    try {
                        const msg = new SpeechSynthesisUtterance("Ambulance has arrived at your location");
                        window.speechSynthesis.speak(msg);
                    } catch(e) {}
                }
            }
        }
    }, [assignedAmbulance, userLocation, incidentStatus, hasArrived, step]);

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
            const parsed = JSON.parse(savedUser);
            setUser({ ...parsed, medicines: parsed.medicines || [], appointments: parsed.appointments || [] });
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
        saveUser(user);
        setStep('dashboard');
    };

    const triggerSOS = async () => {
        setIsTriaging(true);
        const cities = [
            { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
            { name: 'Cuttack', lat: 20.4625, lng: 85.8830 },
            { name: 'Puri', lat: 19.8177, lng: 85.8286 }
        ];
        const defaultCity = cities[Math.floor(Math.random() * cities.length)];

        // Step 1: Run AI Triage if description provided
        let triageData = null;
        if (emergencyDescription.trim()) {
            try {
                const triageResp = await fetch(`${BACKEND_URL}/api/ai-triage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: emergencyDescription,
                        user_vitals: {
                            heartRate: user.heartRate,
                            spo2: user.spo2,
                            bloodPressure: user.bloodPressure,
                            bloodGroup: user.bloodGroup
                        }
                    })
                });
                const triageJson = await triageResp.json();
                if (triageJson.success && triageJson.triage) {
                    triageData = triageJson.triage;
                    setTriageResult(triageData);
                }
            } catch (err) {
                console.error('AI Triage failed, continuing with default:', err);
            }
        }

        // Step 2: Submit SOS with triage-informed type and priority
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
                        type: triageData?.type || 'Critical Medical Alert',
                        priority: triageData?.priority || 3,
                        description: emergencyDescription || undefined
                    })
                });
                const data = await resp.json();
                if (data.success) {
                    setIncidentId(data.id);
                    setStep('sos_active');
                } else {
                    setIncidentId('DEV-' + Date.now());
                    setStep('sos_active');
                }
            } catch (err) {
                console.error('SOS Trigger failed', err);
            }
        };

        if ("geolocation" in navigator) {
            let handled = false;
            // Increased timeout to 10s for real GPS lock
            const timeout = setTimeout(() => {
                if (!handled) {
                    handled = true;
                    console.log("Geolocation timed out, using fallback");
                    submitSOS(defaultCity.lat, defaultCity.lng, defaultCity.name);
                }
            }, 10000);

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (!handled) {
                        handled = true;
                        clearTimeout(timeout);
                        console.log("Exact Geolocation Acquired:", pos.coords);
                        submitSOS(pos.coords.latitude, pos.coords.longitude, "Exact Device Location");
                    }
                },
                (error) => {
                    if (!handled) {
                        handled = true;
                        clearTimeout(timeout);
                        console.warn("Geolocation Error, using fallback:", error.message);
                        submitSOS(defaultCity.lat, defaultCity.lng, defaultCity.name);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

                <button
                    onClick={() => setStep('profile')}
                    className="w-full bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl active:scale-95 transition-transform group hover:border-slate-700"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                            <User size={20} className="text-slate-300" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black text-white">Full Medical Profile</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Vitals • Medicine • Visits</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                </button>

                <div className="pt-12">
                    <SlideToSOS onConfirm={triggerSOS} />
                </div>
            </div>
        );
    }

    if (step === 'profile') {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 space-y-10 flex flex-col pt-12">
                <header className="flex items-center gap-6">
                    <button onClick={() => setStep('dashboard')} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center active:scale-90 transition-transform text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black">Profile</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Medical Identity Data</p>
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
                        <button 
                            onClick={() => setStep('update_vitals')}
                            className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center active:scale-95 text-blue-500 hover:bg-blue-500/10 transition-all shadow-lg"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </div>

                <VitalsGraph sys={parseInt((user.bloodPressure || '120').split('/')[0])} hr={parseInt(user.heartRate) || 72} />

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button onClick={() => setStep('medicine')} className="bg-slate-900 border border-slate-800 p-6 rounded-[3rem] flex flex-col items-center justify-center gap-4 shadow-xl active:scale-95 transition-transform group hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-14 h-14 bg-slate-950 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-500/10 transition-colors border border-slate-800 group-hover:border-blue-500/30">
                            <Pill size={24} className="text-blue-500" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Medicine</span>
                    </button>
                    <button onClick={() => setStep('appointments')} className="bg-slate-900 border border-slate-800 p-6 rounded-[3rem] flex flex-col items-center justify-center gap-4 shadow-xl active:scale-95 transition-transform group hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-14 h-14 bg-slate-950 rounded-[2rem] flex items-center justify-center group-hover:bg-purple-500/10 transition-colors border border-slate-800 group-hover:border-purple-500/30">
                            <Calendar size={24} className="text-purple-500" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Visits</span>
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/50 w-full animate-in fade-in duration-500">
                    <button 
                        onClick={() => {
                            localStorage.removeItem('eros_citizen_profile');
                            setUser({ name: '', phone: '', spo2: '', heartRate: '', bloodGroup: '', bloodPressure: '', city: '', state: '', medicines: [], appointments: [] });
                            setStep('register');
                        }} 
                        className="w-full bg-slate-950 border border-red-500/30 text-red-500 font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-xl active:scale-95 transition-transform hover:bg-red-500/10 flex items-center justify-center gap-2"
                    >
                        <Shield size={16}/> Clear Data & Logout
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'update_vitals') {
        const handleUpdateVitals = (e) => {
            e.preventDefault();
            saveUser({
                ...user,
                heartRate: e.target.hr.value,
                spo2: e.target.spo2.value,
                bloodPressure: e.target.bp.value
            });
            setStep('profile');
        };

        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 space-y-10 flex flex-col pt-12">
                <header className="flex items-center gap-6">
                    <button onClick={() => setStep('profile')} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center active:scale-90 transition-transform text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black">Refresh Vitals</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Live Health Update</p>
                    </div>
                </header>

                <div className="glass p-8 rounded-[3rem] border-slate-800 shadow-2xl">
                    <form onSubmit={handleUpdateVitals} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Heart Rate (BPM)</label>
                            <input required name="hr" type="number" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" defaultValue={user.heartRate} placeholder="e.g. 72" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SpO2 (%)</label>
                            <input required name="spo2" type="number" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" defaultValue={user.spo2} placeholder="e.g. 98" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Blood Pressure</label>
                            <input required name="bp" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4" defaultValue={user.bloodPressure} placeholder="e.g. 120/80" />
                        </div>
                        <button className="w-full bg-blue-600 font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-transform">UPDATE VITALS</button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 'medicine') {
        const handleAddMed = (e) => {
            e.preventDefault();
            const md = {
                id: Date.now(),
                name: e.target.mname.value,
                dosage: e.target.mdosage.value,
                freq: e.target.mfreq.value,
                time: e.target.mtime.value
            };
            saveUser({ ...user, medicines: [...(user.medicines || []), md] });
            e.target.reset();
        };

        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 space-y-10 flex flex-col pt-12">
                <header className="flex items-center gap-6">
                    <button onClick={() => setStep('profile')} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center active:scale-90 transition-transform text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black">Medicine</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Prescription Tracker</p>
                    </div>
                </header>

                <div className="glass p-8 rounded-[3rem] border-blue-500/20 shadow-[0_20px_40px_rgba(59,130,246,0.05)]">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Plus size={14} /> Add Medication</h3>
                    <form onSubmit={handleAddMed} className="space-y-4">
                        <input required name="mname" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm" placeholder="Medicine Name" />
                        <div className="grid grid-cols-2 gap-4">
                            <input required name="mdosage" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm" placeholder="Dosage (e.g. 50mg)" />
                            <select required name="mfreq" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-400">
                                <option value="" disabled selected>Frequency</option>
                                <option value="Once Daily">Once Daily</option>
                                <option value="Twice Daily">Twice Daily</option>
                                <option value="As Needed">As Needed</option>
                            </select>
                        </div>
                        <input required type="time" name="mtime" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-300 [&::-webkit-calendar-picker-indicator]:invert" />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-colors shadow-lg shadow-blue-600/20">REGISTER MEDICINE</button>
                    </form>
                </div>

                <div className="flex-1 space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Today's Protocol</h3>
                    {(!user.medicines || user.medicines.length === 0) ? (
                        <div className="text-center py-10 bg-slate-900/50 rounded-[3rem] border border-slate-800 border-dashed">
                            <Pill size={24} className="mx-auto text-slate-600 mb-2" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No active medications</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {user.medicines.map(m => (
                                <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 text-blue-500 shadow-inner">
                                            <span className="text-[10px] font-black">{m.time}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">{m.name}</p>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.dosage} • {m.freq}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => saveUser({...user, medicines: user.medicines.filter(x => x.id !== m.id)})} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'appointments') {
        const handleAddAppt = (e) => {
            e.preventDefault();
            const md = {
                id: Date.now(),
                docName: e.target.dname.value,
                date: e.target.ddate.value,
                time: e.target.dtime.value,
                reason: e.target.dreason.value
            };
            saveUser({ ...user, appointments: [...(user.appointments || []), md] });
            e.target.reset();
        };

        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 space-y-10 flex flex-col pt-12">
                <header className="flex items-center gap-6">
                    <button onClick={() => setStep('profile')} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center active:scale-90 transition-transform text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black">Visits</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Medical Care Schedule</p>
                    </div>
                </header>

                <div className="glass p-8 rounded-[3rem] border-purple-500/20 shadow-[0_20px_40px_rgba(168,85,247,0.05)]">
                    <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CalendarPlus size={14} /> Schedule Visit</h3>
                    <form onSubmit={handleAddAppt} className="space-y-4">
                        <input required name="dname" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm" placeholder="Doctor's Name (e.g. Dr. Roberts)" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><Calendar size={18} /></span>
                                <input required type="date" name="ddate" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 pl-12 text-sm text-slate-300 [&::-webkit-calendar-picker-indicator]:invert" />
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><Clock size={18} /></span>
                                <input required type="time" name="dtime" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 pl-12 text-sm text-slate-300 [&::-webkit-calendar-picker-indicator]:invert" />
                            </div>
                        </div>
                        <input required name="dreason" className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-sm" placeholder="Reason for Visit (e.g. Checkup)" />
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl transition-colors shadow-lg shadow-purple-600/20">CONFIRM BOOKING</button>
                    </form>
                </div>

                <div className="flex-1 space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Upcoming Consultations</h3>
                    {(!user.appointments || user.appointments.length === 0) ? (
                        <div className="text-center py-10 bg-slate-900/50 rounded-[3rem] border border-slate-800 border-dashed">
                            <Stethoscope size={24} className="mx-auto text-slate-600 mb-2" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No scheduled visits</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {user.appointments.map(a => (
                                <div key={a.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 text-purple-500 shadow-inner">
                                            <span className="text-[12px] font-black">{new Date(a.date).getDate() || '--'}</span>
                                            <span className="text-[8px] font-black uppercase text-slate-500">{a.date ? new Date(a.date).toLocaleString('default', { month: 'short' }) : 'MON'}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">{a.docName}</p>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{a.time} • {a.reason}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => saveUser({...user, appointments: user.appointments.filter(x => x.id !== a.id)})} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'sos_active') {
        const isTransporting = incidentStatus === 'enroute_hospital' || incidentStatus === 'pickup';

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col text-white animate-in fade-in duration-1000 relative overflow-hidden">
                {/* Visual Overlays */}
                <div className="absolute inset-0 pointer-events-none z-[10] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-red-600/5 to-transparent"></div>
                    <div className="scanline"></div>
                </div>

                {/* Top Section: Elite Status HUD & Ambulance Banner */}
                <div className="p-6 space-y-6 relative z-20 bg-slate-950">
                    <div className="glass p-5 rounded-[2.5rem] border-red-600/30 flex items-center justify-between shadow-2xl backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-red-500 italic">Emergency Matrix Active</span>
                                <p className="text-[10px] font-bold text-slate-500">
                                    {triageResult ? `AI: ${triageResult.type} — Priority ${triageResult.priority}` : 'Live Satellite Response Link Wired'}
                                </p>
                            </div>
                        </div>
                        <Zap size={20} className="text-red-600" />
                    </div>

                    {/* AI Triage Assessment Card */}
                    {triageResult && (
                        <div className="glass p-5 rounded-[2rem] border-purple-500/30 backdrop-blur-md animate-in fade-in duration-700">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                    <Activity size={16} className="text-blue-400" />
                                </div>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Automated Triage</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200 leading-relaxed">{triageResult.summary}</p>
                            <div className="flex gap-2 mt-3 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${triageResult.priority <= 2 ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                                    triageResult.priority <= 3 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' :
                                        'bg-green-600/20 text-green-400 border border-green-500/30'
                                    }`}>Priority {triageResult.priority}</span>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">{triageResult.type}</span>
                            </div>
                        </div>
                    )}

                    {/* Ambulance Arriving Card */}
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
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${hasArrived ? 'text-green-500' : isTransporting ? 'text-blue-500' : 'text-orange-500'}`}>
                                        {hasArrived ? 'ARRIVED AT LOCATION' : incidentStatus === 'enroute_hospital' ? 'Hospital Transport' :
                                            incidentStatus === 'pickup' ? 'Ambulance On-Site' : 'High-Speed response'}
                                    </p>
                                    <p className={`text-4xl font-black tabular-nums ${hasArrived ? 'text-white' : ''}`}>
                                        {hasArrived ? 'NOW' : incidentStatus === 'pickup' ? 'LOADING' : (incidentStatus === 'enroute_hospital' ? '03:15' : '02:40')}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                                        <Activity size={18} className="text-red-500" />
                                    </div>
                                    <span className="text-sm font-bold leading-tight">
                                        {hasArrived 
                                            ? 'Your emergency unit is now at your location. Medical help is with you.'
                                            : incidentStatus === 'enroute_hospital'
                                            ? 'Life-Support systems engaged for hospital transport'
                                            : 'Siren active. Unit clearing traffic for immediate arrival'}
                                    </span>
                                </div>
                                <div className="h-6 bg-slate-950 rounded-2xl p-1 border border-slate-900 relative overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${hasArrived ? 'from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] w-full' : 'from-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]'} rounded-xl transition-all duration-1000 ${!hasArrived ? (incidentStatus === 'pickup' ? 'w-1/2' : (incidentStatus === 'enroute_hospital' ? 'w-full' : 'w-1/4')) : ''
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

                {/* Middle Section: Live Tracking Map */}
                <div className="relative flex-1 min-h-[300px] sm:min-h-[400px] w-full z-10 border-y border-slate-800 shadow-[inset_0_20px_40px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0">
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
                                <>
                                    <Marker
                                        position={[assignedAmbulance.location.lat, assignedAmbulance.location.lng]}
                                        icon={ambulanceIcon}
                                    />
                                    {userLocation && (
                                        <Polyline
                                            positions={[
                                                [userLocation.lat, userLocation.lng],
                                                [assignedAmbulance.location.lat, assignedAmbulance.location.lng]
                                            ]}
                                            pathOptions={{ 
                                                color: '#ef4444', 
                                                weight: 4, 
                                                dashArray: '10, 10', 
                                                opacity: 0.6,
                                                lineJoin: 'round'
                                            }}
                                        />
                                    )}
                                </>
                            )}

                            {hospitals.filter(h => h.city === userLocation?.city).map(h => (
                                <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={hospitalIcon} />
                            ))}
                        </MapContainer>
                    </div>
                </div>

                {/* Bottom Section: Buttons */}
                <div className="p-6 space-y-4 relative z-20 bg-slate-950">
                    {hasArrived ? (
                        <button className="w-full bg-green-600 border border-green-500/50 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(34,197,94,0.4)] pointer-events-none transition-all">
                            <CheckCircle size={24} /> RESPONDERS ARRIVED
                        </button>
                    ) : (
                        <button className="w-full bg-red-600 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(220,38,38,0.4)] transition-transform active:scale-95 group">
                            <Phone size={24} className="group-hover:animate-shake" /> CALL COORDINATOR
                        </button>
                    )}
                </div>

                {hasArrived && (
                    <div className="absolute inset-0 z-[3000] bg-slate-950/80 backdrop-blur-md flex flex-col justify-end p-6 pb-12 animate-in fade-in duration-500">
                        <div className="bg-green-600 border border-green-400/30 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(34,197,94,0.5)] transform hover:scale-[1.02] transition-transform animate-in slide-in-from-bottom-10 space-y-5">
                            <div className="flex items-start gap-4 mb-2">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.2)] flex-shrink-0 animate-[bounce_2s_ease-in-out_infinite]">
                                    <CheckCircle size={32} className="text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-white text-2xl font-black leading-tight tracking-tight uppercase">Ambulance<br/>Reached You</h2>
                                </div>
                            </div>
                            <div className="h-px w-full bg-white/20"></div>
                            <p className="text-green-50 font-bold text-sm leading-relaxed">
                                The assigned unit <span className="bg-white/20 px-2 py-0.5 rounded text-white font-black">{assignedAmbulance?.id || 'AMB-149'}</span> has arrived at your exact location. Please ensure the pathway is clear and follow instructions from first responders.
                            </p>
                            <button 
                                onClick={() => setHasArrived(false)}
                                className="w-full mt-6 bg-white border border-green-700 hover:bg-green-50 text-green-700 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-colors shadow-lg"
                            >
                                DISMISS ALERT
                            </button>
                        </div>
                    </div>
                )}

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
