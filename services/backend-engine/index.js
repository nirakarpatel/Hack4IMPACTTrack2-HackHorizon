const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const EROSSimulator = require('./simulator');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const simulator = new EROSSimulator(io);

const PORT = process.env.PORT || 4000;
const AI_ROUTER_URL = process.env.AI_ROUTER_URL || 'http://127.0.0.1:8000';

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'EROS Backend Engine is running.',
        simulator: simulator.simulatorActive ? 'active' : 'inactive',
        trafficFactor: simulator.trafficFactor
    });
});

// Simulator Toggle
app.post('/api/simulator/toggle', (req, res) => {
    const { active } = req.body;
    if (active) {
        simulator.start();
    } else {
        simulator.stop();
    }
    res.json({ success: true, active: simulator.simulatorActive });
});

// History endpoint
app.get('/api/history', (req, res) => {
    res.json({ success: true, history: simulator.resolvedHistory });
});

// AI Proxy endpoint
app.post('/api/ai-recommendations', async (req, res) => {
    try {
        const { incidentId } = req.body;
        const incident = simulator.pendingIncidents.get(incidentId);
        if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

        const ambulances = simulator.ambulances.map(a => ({
            id: a.id,
            location: a.location,
            status: a.status,
            equipment: a.equipment,
            type: a.type
        }));

        const response = await axios.post(`${AI_ROUTER_URL}/find-nearest`, {
            emergency: {
                id: incident.id,
                location: incident.location,
                type: incident.type,
                priority: incident.priority || 3
            },
            ambulances: ambulances
        });

        res.json(response.data);
    } catch (e) {
        console.error('[BACKEND] AI Proxy Error:', e.message);
        res.status(500).json({ success: false, message: 'AI Router communication failed' });
    }
});

// AI Triage Proxy — Classifies emergency description using open-source LLM
app.post('/api/ai-triage', async (req, res) => {
    try {
        const { description, user_vitals } = req.body;
        if (!description) return res.status(400).json({ success: false, message: 'Description is required' });

        const response = await axios.post(`${AI_ROUTER_URL}/triage`, {
            description,
            user_vitals: user_vitals || null
        });

        res.json(response.data);
    } catch (e) {
        console.error('[BACKEND] AI Triage Error:', e.message);
        // Return a basic fallback if AI Router is completely down
        res.json({
            success: true,
            triage: {
                type: 'Medical Emergency',
                priority: 3,
                summary: 'AI triage unavailable — defaulting to general medical response.',
                recommended_equipment: ['First Aid', 'Oxygen'],
                ai_source: 'backend_fallback'
            }
        });
    }
});

// AI Copilot Proxy — Dispatcher AI assistant
app.post('/api/ai-copilot', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        // Build context from live simulator state
        const context = {
            pending_incidents: Array.from(simulator.pendingIncidents.values()).map(i => ({
                id: i.id, type: i.type, city: i.city, status: i.status,
                citizenId: i.citizenId, timestamp: i.timestamp
            })),
            ambulances: simulator.ambulances.map(a => ({
                id: a.id, status: a.status, city: a.city, type: a.type
            })),
            resolved_count: simulator.resolvedHistory.length,
            traffic_factor: simulator.trafficFactor
        };

        const response = await axios.post(`${AI_ROUTER_URL}/copilot`, {
            message,
            context
        });

        res.json(response.data);
    } catch (e) {
        console.error('[BACKEND] AI Copilot Error:', e.message);
        res.json({
            success: true,
            response: 'Copilot is currently offline. Please use manual dispatch protocols.',
            ai_source: 'backend_fallback'
        });
    }
});

// Simulator Manual Dispatch
app.post('/api/simulator/assign', async (req, res) => {
    const { incidentId, ambulanceId } = req.body;
    const result = await simulator.manualAssign(incidentId, ambulanceId);
    res.json(result);
});

// Simulator Auto-Dispatch Toggle
app.post('/api/simulator/auto-dispatch', (req, res) => {
    const { enabled } = req.body;
    simulator.toggleAutoDispatch(enabled);
    res.json({ success: true, autoDispatch: simulator.autoDispatch });
});

// Registration endpoint (Simple persistence for demo)
app.post('/api/register', (req, res) => {
    const { phone, name, bloodType, allergies } = req.body;
    console.log(`[USER REGISTERED] Name: ${name}, Phone: ${phone}`);
    res.json({ success: true, message: 'User registered successfully' });
});

// SOS Trigger endpoint
app.post('/api/sos', async (req, res) => {
    const { citizenId, location, type, userProfile, priority } = req.body;
    const emergencyId = Date.now().toString();

    const incidentData = {
        id: emergencyId,
        citizenId,
        userProfile,
        location,
        city: req.body.city || (location && location.city),
        type,
        priority: priority || 3,
        timestamp: new Date().toISOString(),
        status: 'pending',
        isDemo: req.body.isDemo || false
    };

    // Persist to Firestore if available
    const firestore = db.firestore();
    if (firestore) {
        try {
            await firestore.collection('active_incidents').doc(emergencyId).set(incidentData);
        } catch (e) {
            console.error('[FIREBASE] Error persisting incident:', e.message);
        }
    }

    // Register with simulator for ambulance movement and broadcasting
    simulator.handleRealSOS(incidentData);

    res.status(202).json({ success: true, message: 'SOS received and broadcasting.', id: emergencyId });
});

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });

    // Handle ambulance status updates
    socket.on('update_ambulance_location', (data) => {
        socket.broadcast.emit('ambulance_location_update', data);
    });
});

server.listen(PORT, () => {
    console.log(`EROS Backend Engine listening on port ${PORT}`);
});
