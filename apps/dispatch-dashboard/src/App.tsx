import React from 'react';
import DashboardStats from './components/DashboardStats';
import LiveMap from './components/LiveMap';
import IncidentQueue from './components/IncidentQueue';
import { Shield, Bell, Settings, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';

export default function App() {
    const [simulatorActive, setSimulatorActive] = React.useState(false);
    const [autoDispatch, setAutoDispatch] = React.useState(true);

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const resp = await fetch(`${BACKEND_URL}/health`);
                const data = await resp.json();
                setSimulatorActive(data.simulator === 'active');
            } catch (e) {
                console.error('Failed to connect to backend', e);
            }
        };
        checkStatus();
    }, []);

    const toggleSimulator = async () => {
        try {
            const resp = await fetch(`${BACKEND_URL}/api/simulator/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !simulatorActive })
            });
            const data = await resp.json();
            setSimulatorActive(data.active);
        } catch (e) {
            console.error('Failed to toggle simulator');
        }
    };

    const toggleAutoDispatch = async () => {
        try {
            const resp = await fetch(`${BACKEND_URL}/api/simulator/auto-dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !autoDispatch })
            });
            const data = await resp.json();
            setAutoDispatch(data.autoDispatch);
        } catch (e) {
            console.error('Failed to toggle auto-dispatch');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            {/* Top Navigation */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                            <Shield size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter leading-none">EROS</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Emergency Response OS</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Auto Dispatch Toggle */}
                        <button
                            onClick={toggleAutoDispatch}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider ${autoDispatch
                                ? 'bg-green-600/20 border-green-500/50 text-green-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${autoDispatch ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                            <span>{autoDispatch ? 'AI Auto-Dispatch ON' : 'Manual Dispatch mode'}</span>
                        </button>

                        {/* Simulator Toggle */}
                        <button
                            onClick={toggleSimulator}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider ${simulatorActive
                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${simulatorActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></div>
                            <span>
                                {simulatorActive ? 'Simulator Active' : 'Start Simulator'}
                            </span>
                        </button>

                        <div className="flex flex-col items-end mr-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">System Online</span>
                            </div>
                            <span className="text-[8px] text-slate-500 font-mono mt-1 italic">Last Sync: {new Date().toLocaleTimeString()}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                <Bell size={20} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                <Settings size={20} />
                            </button>
                            <div className="h-8 w-[1px] bg-slate-800"></div>
                            <button className="flex items-center gap-2 pl-2">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                    <User size={18} />
                                </div>
                                <span className="text-sm font-medium">Dispatcher 04</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="max-w-[1800px] mx-auto p-6 space-y-6">
                {/* Statistics Row */}
                <DashboardStats />

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Map Column */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1 shadow-2xl overflow-hidden h-[600px]">
                            <LiveMap />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                    Active Hospital Capacities
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { name: 'City General Hospital', capacity: 85, color: 'bg-blue-500' },
                                        { name: 'St. Mary\'s Medical Center', capacity: 42, color: 'bg-green-500' },
                                        { name: 'Emergency Trauma Care', capacity: 94, color: 'bg-red-500' },
                                    ].map((hosp) => (
                                        <div key={hosp.name} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-300">{hosp.name}</span>
                                                <span className="font-bold">{hosp.capacity}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full">
                                                <div className={`h-full rounded-full ${hosp.color}`} style={{ width: `${hosp.capacity}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                                    Weather & Grid Status
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Temperature</p>
                                        <p className="text-2xl font-black">28°C</p>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Conditions</p>
                                        <p className="text-lg font-bold">Rain Shower</p>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-500 font-medium">
                                    ⚠️ Traffic delay expected in North Sector due to heavy rainfall.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Incident Column */}
                    <div className="lg:col-span-4 h-full">
                        <IncidentQueue />
                    </div>
                </div>
            </main>
        </div>
    );
}
