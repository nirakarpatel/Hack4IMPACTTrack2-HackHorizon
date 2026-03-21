import React from 'react';
import DashboardStats from './components/DashboardStats';
import LiveMap from './components/LiveMap';
import IncidentQueue from './components/IncidentQueue';
import AICopilot from './components/AICopilot';
import { Shield, Bell, Settings, User, Bot } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';

export default function App() {
    const [simulatorActive, setSimulatorActive] = React.useState(false);
    const [autoDispatch, setAutoDispatch] = React.useState(true);
    const [showCopilot, setShowCopilot] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showProfile, setShowProfile] = React.useState(false);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

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

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-[0] opacity-30">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.1)_0%,transparent_70%)]"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)] rounded-full blur-3xl"></div>
                </div>
                
                <div className="z-10 w-full max-w-[400px] p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] mb-5">
                            <Shield size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter leading-none mb-1">EROS</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Emergency Response OS</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2"><User size={12}/> Dispatcher ID</label>
                            <input type="text" placeholder="DSP-4029" className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 outline-none transition-all font-medium text-sm text-white focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2"><Settings size={12}/> Security Passcode</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 outline-none transition-all font-medium text-sm text-white focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600" required />
                        </div>
                        
                        <button type="submit" className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all flex justify-center items-center gap-2">
                            <Shield size={16}/> Authenticate
                        </button>
                    </form>
                </div>
                
                <p className="absolute bottom-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Restricted Access. Central Command Authorized Personnel Only.</p>
            </div>
        );
    }

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

                        {/* AI Copilot Toggle */}
                        <button
                            onClick={() => setShowCopilot(!showCopilot)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider ${showCopilot
                                ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            <Bot size={14} />
                            <span>AI Copilot</span>
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
                            <button 
                                onClick={() => setShowSettings(true)}
                                className={`p-2 transition-transform duration-500 ${showSettings ? 'text-white rotate-90' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Settings size={20} />
                            </button>
                            <div className="h-8 w-[1px] bg-slate-800"></div>
                            <div className="relative">
                                <button 
                                    onClick={() => setShowProfile(!showProfile)}
                                    className={`flex items-center gap-2 pl-2 transition-opacity ${showProfile ? 'opacity-100' : 'hover:opacity-80'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                        <User size={18} />
                                    </div>
                                    <span className="text-sm font-medium">Dispatcher 04</span>
                                </button>
                                
                                {showProfile && (
                                    <>
                                        {/* Click outside backdrop */}
                                        <div 
                                            className="fixed inset-0 z-[190]" 
                                            onClick={() => setShowProfile(false)}
                                        ></div>
                                        
                                        {/* Dropdown Menu */}
                                        <div className="absolute right-0 top-full mt-4 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-4 border-b border-slate-800 bg-slate-800/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                                                        <User size={24} className="text-white"/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white">Aditya Sekhar Das</h4>
                                                        <p className="text-xs text-blue-400 font-medium">Senior Dispatcher</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <div className="px-3 py-2 flex justify-between items-center text-sm">
                                                    <span className="text-slate-400">Shift Started</span>
                                                    <span className="font-bold text-slate-200">06:00 AM</span>
                                                </div>
                                                <div className="px-3 py-2 flex justify-between items-center text-sm">
                                                    <span className="text-slate-400">Incidents Handled</span>
                                                    <span className="font-bold text-green-400">42 Today</span>
                                                </div>
                                                <div className="px-3 py-2 flex justify-between items-center text-sm">
                                                    <span className="text-slate-400">Current Region</span>
                                                    <span className="font-bold text-slate-200">Sector 7 Central</span>
                                                </div>
                                            </div>
                                            <div className="p-2 border-t border-slate-800">
                                                <button className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2">
                                                    <Settings size={14}/> Account Settings
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setIsAuthenticated(false);
                                                        setShowProfile(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-red-500 hover:text-white hover:bg-red-500/20 transition-colors mt-1"
                                                >
                                                    End Shift / Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
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

                {/* Settings Overlay */}
                {showSettings && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] animate-in fade-in duration-300"
                            onClick={() => setShowSettings(false)}
                        ></div>
                        
                        {/* Panel */}
                        <div className="fixed inset-y-0 right-0 w-96 bg-slate-950/95 backdrop-blur-3xl border-l border-slate-800 shadow-[[-20px_0_60px_rgba(0,0,0,0.8)]] z-[200] flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                        <Settings size={20} className="text-blue-500 animate-[spin_4s_linear_infinite]"/> COMMAND CENTER
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Configuration</p>
                                </div>
                                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all">
                                    ✕
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                {/* AI Strictness */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Shield size={14} className="text-blue-500"/> AI Dispatch Strictness
                                    </h3>
                                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                                        <input type="range" min="1" max="100" defaultValue="85" className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500 uppercase">
                                            <span>Speed Focus</span>
                                            <span>Accuracy Check</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Audio Alerts */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Bell size={14} className="text-orange-500"/> Communications
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                                            <span className="text-sm font-bold text-slate-300">Global Mute</span>
                                            <input type="checkbox" className="w-4 h-4 accent-red-500 rounded bg-slate-800 border-slate-700" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                                            <span className="text-sm font-bold text-slate-300">Priority Sirens Only</span>
                                            <input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500 rounded bg-slate-800 border-slate-700" />
                                        </label>
                                    </div>
                                </div>

                                {/* Map Tactical View */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Map Interface</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="px-4 py-3 bg-blue-600/20 border border-blue-500/50 rounded-xl text-xs font-bold text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                                            Radar Dark
                                        </button>
                                        <button className="px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 transition-colors">
                                            Satellite
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                                <button className="w-full py-4 bg-red-600/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-600/20">
                                    TEST EMERGENCY BROADCAST
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* AI Copilot Panel */}
                <AICopilot isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
            </main>
        </div>
    );
}
