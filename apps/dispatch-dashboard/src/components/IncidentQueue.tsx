import React, { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { AlertCircle, Clock, MapPin, Ambulance, User, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface Emergency {
    id: string;
    citizenId: string;
    userProfile?: {
        name: string;
        phone: string;
        bloodType?: string;
        allergies?: string;
        spo2?: string;
        heartRate?: string;
        bloodGroup?: string;
        bloodPressure?: string;
        city?: string;
        state?: string;
    };
    location: { lat: number; lng: number; address?: string };
    type: string;
    timestamp: string;
    priority?: number;
    status: 'pending' | 'dispatched' | 'enroute' | 'enroute_patient' | 'pickup' | 'enroute_hospital' | 'dropoff' | 'resolved';
}

interface Recommendation {
    ambulance_id: string;
    type: string;
    distance_km: number;
    estimated_time_min: number;
    equipment_match_score: number;
    reasoning: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';

export default function IncidentQueue() {
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [recommendations, setRecommendations] = useState<Record<string, Recommendation[]>>({});
    const [loadingRecs, setLoadingRecs] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const handleConnect = () => {
            socket.emit('request_initial_state');
        };

        const handleNewEmergency = (data: Emergency) => {
            setEmergencies((prev) => [data, ...prev]);
            fetchRecommendations(data.id);
        };

        const handleAmbulanceAssigned = (data: { ambId: string, incidentId: string, status: string }) => {
            setEmergencies((prev) => prev.map(e =>
                e.id === data.incidentId ? { ...e, status: data.status as any, assigned_ambulance_id: data.ambId } : e
            ));
        };

        const handlePendingIncidents = (data: Emergency[]) => {
            setEmergencies(data);
            data.forEach(inc => {
                if (inc.status === 'pending') fetchRecommendations(inc.id);
            });
        };

        const handleAmbulanceStatus = (data: { ambId: string, status: string, incidentId?: string }) => {
            setEmergencies((prev) => prev.map(e =>
                (e.id === data.incidentId || (e as any).assigned_ambulance_id === data.ambId)
                    ? { ...e, status: data.status as any }
                    : e
            ));
        };

        if (socket.connected) {
            socket.emit('request_initial_state');
        }

        socket.on('connect', handleConnect);
        socket.on('new_emergency', handleNewEmergency);
        socket.on('ambulance_assigned', handleAmbulanceAssigned);
        socket.on('pending_incidents_update', handlePendingIncidents);
        socket.on('ambulance_status_update', handleAmbulanceStatus);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('new_emergency', handleNewEmergency);
            socket.off('ambulance_assigned', handleAmbulanceAssigned);
            socket.off('pending_incidents_update', handlePendingIncidents);
            socket.off('ambulance_status_update', handleAmbulanceStatus);
        };
    }, []);

    const fetchRecommendations = async (incidentId: string) => {
        setLoadingRecs(prev => ({ ...prev, [incidentId]: true }));
        try {
            const response = await fetch(`${BACKEND_URL}/api/ai-recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId })
            });
            const data = await response.json();
            if (data.success) {
                setRecommendations(prev => ({ ...prev, [incidentId]: data.recommendations }));
            }
        } catch (e) {
            console.error('Failed to fetch AI recommendations', e);
        } finally {
            setLoadingRecs(prev => ({ ...prev, [incidentId]: false }));
        }
    };

    const handleAssign = async (incidentId: string, ambId?: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/simulator/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId, ambulanceId: ambId })
            });
            const result = await response.json();
            if (!result.success) alert(`Assignment failed: ${result.message}`);
        } catch (e) {
            console.error('Manual assignment failed', e);
        }
    };

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl text-white p-5 rounded-3xl border border-white/5 h-[700px] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
                        <AlertCircle className="text-red-500 animate-pulse" />
                        ACTIVE DEPLOYMENTS
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time Emergency Feed</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-pulse">
                        {emergencies.length} ACTIVE
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {emergencies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40">
                        <Clock size={64} strokeWidth={1} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-[0.3em]">Monitoring SOS Frequencies...</p>
                    </div>
                ) : (
                    emergencies.map((incident) => (
                        <div
                            key={incident.id}
                            className={`p-5 rounded-2xl border bg-slate-950/50 transition-all hover:bg-slate-950/80 ${incident.status === 'pending'
                                ? 'border-red-500/30'
                                : 'border-white/5'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                            incident.type.includes('Cardiac') ? 'bg-red-500 text-white' : 'bg-orange-500/20 text-orange-400'
                                        }`}>
                                            {incident.type.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">#{incident.id.slice(-6)}</span>
                                    </div>
                                    <h4 className="font-black text-sm text-slate-100">{incident.userProfile?.name || 'Anonymous User'}</h4>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                                    {new Date(incident.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <MapPin size={12} className="text-slate-600" />
                                    <span className="truncate">{incident.location.address || 'Locating...'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Ambulance size={12} className="text-slate-600" />
                                    <span className={`uppercase font-black text-[9px] tracking-widest px-2 py-0.5 rounded-full ${
                                        incident.status === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                        {incident.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Citizen Health Metrics Pane */}
                            {incident.userProfile && (incident.userProfile.spo2 || incident.userProfile.bloodGroup) && (
                                <div className="mb-4 p-3 bg-slate-900 border border-white/5 rounded-xl grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">SpO2:</span>
                                        <span className="font-black text-slate-300">{incident.userProfile.spo2 || '--'}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Heart Rate:</span>
                                        <span className="font-black text-slate-300">{incident.userProfile.heartRate || '--'} bpm</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">BP:</span>
                                        <span className="font-black text-slate-300">{incident.userProfile.bloodPressure || '--'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Blood Group:</span>
                                        <span className="font-black text-red-400">{incident.userProfile.bloodGroup || incident.userProfile.bloodType || '--'}</span>
                                    </div>
                                </div>
                            )}

                            {/* AI Recommendations Panel */}
                            {incident.status === 'pending' && recommendations[incident.id] && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                                        <BrainCircuit size={14} />
                                        AI Smart Matching
                                    </div>
                                    {recommendations[incident.id].map((rec, idx) => (
                                        <div key={rec.ambulance_id} className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                            idx === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900 border-white/5'
                                        }`} onClick={() => handleAssign(incident.id, rec.ambulance_id)}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-[10px] text-white">{rec.ambulance_id}</span>
                                                    <span className="text-[9px] text-slate-500 uppercase font-bold">{rec.type}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle2 size={12} className={idx === 0 ? 'text-blue-500' : 'text-slate-700'} />
                                                    <span className="text-[10px] font-black text-white">{rec.estimated_time_min}M</span>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 italic">"{rec.reasoning}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {incident.status === 'pending' && !loadingRecs[incident.id] && !recommendations[incident.id] && (
                                <button
                                    onClick={() => handleAssign(incident.id)}
                                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white text-[10px] py-2.5 rounded-xl font-black transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-red-900/20"
                                >
                                    DIRECT DISPATCH
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
