import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Loader2, ChevronDown } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    aiSource?: string;
}

export default function AICopilot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'system',
            content: 'EROS Dispatch Copilot online. Ask me about incidents, ambulance availability, dispatch recommendations, or emergency protocols.',
            timestamp: new Date().toLocaleTimeString(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const resp = await fetch(`${BACKEND_URL}/api/ai-copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await resp.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'No response received.',
                timestamp: new Date().toLocaleTimeString(),
                aiSource: data.ai_source,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Failed to reach AI Copilot. Ensure the backend and AI Router are running.',
                timestamp: new Date().toLocaleTimeString(),
                aiSource: 'error',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickActions = [
        'Which ambulances are available near Delhi?',
        'What are the active incidents right now?',
        'How should I prioritize the current queue?',
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200] w-[420px] h-[600px] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <Bot size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-tight">AI Copilot</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">EROS Protocol Active</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : msg.role === 'system'
                                    ? 'bg-purple-600/10 border border-purple-500/20 text-purple-300 rounded-bl-md'
                                    : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-bl-md'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[8px] opacity-50 font-mono">{msg.timestamp}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2">
                            <Loader2 size={14} className="text-purple-400 animate-spin" />
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Analyzing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (show only if few messages) */}
            {messages.length <= 2 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => { setInput(action); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-[10px] font-bold text-slate-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                        >
                            {action}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-2 focus-within:border-purple-500/40 transition-colors">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask the AI Copilot..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
