const axios = require('axios');
const { generateIndiaHospitals, INDIA_CITIES } = require('./hospitals_india');

class EROSSimulator {
    constructor(io) {
        this.io = io;

        this.hospitals = generateIndiaHospitals();

        // Fleet Distribution: Place 2-3 ambulances in each major city at start
        this.ambulances = [];
        let ambCounter = 101;

        const EQUIPMENT_POOLS = {
            'Basic': ['Oxygen', 'First Aid'],
            'Advanced': ['Oxygen', 'ACLS', 'First Aid', 'AED'],
            'ICU': ['Oxygen', 'ACLS', 'Ventilator', 'Patient Monitor', 'Syringe Pump']
        };

        INDIA_CITIES.forEach(city => {
            const cityHospitals = this.hospitals.filter(h => h.city === city.name);
            cityHospitals.forEach(hosp => {
                for (let i = 0; i < 3; i++) { // Reduced count for performance, but 3 in each is plenty
                    const type = i === 0 ? 'ICU' : (i === 1 ? 'Advanced' : 'Basic');
                    this.ambulances.push({
                        id: `AMB-${ambCounter++}`,
                        location: { ...hosp.location },
                        status: 'available',
                        baseHospitalId: hosp.id,
                        city: city.name,
                        type: type,
                        equipment: EQUIPMENT_POOLS[type],
                        heading: Math.random() * 360
                    });
                }
            });
        });

        this.reserveUnits = [];
        // Add reserves at each city
        INDIA_CITIES.forEach((city, cityIdx) => {
            for (let i = 1; i <= 2; i++) {
                const hospId = this.hospitals.find(h => h.city === city.name).id;
                this.reserveUnits.push({
                    id: `AMB-RE-${city.name.substring(0, 3).toUpperCase()}-${i}`,
                    status: 'reserve',
                    baseHospitalId: hospId,
                    city: city.name,
                    type: 'Advanced',
                    equipment: EQUIPMENT_POOLS['Advanced']
                });
            }
        });

        this.activeIncidents = new Map();
        this.pendingIncidents = new Map();
        this.resolvedHistory = []; // Track past incidents
        this.simulatorActive = true; 
        this.autoDispatch = true;
        this.trafficFactor = 1.0; // 1.0 = Normal, 0.5 = Heavy, 1.5 = Clear

        // Force start movement interval immediately
        this.movementInterval = setInterval(() => this.updateSimulationStep(), 1500);
        this.sosInterval = setInterval(() => this.generateRandomSOS(), 25000); 

        // Handle initial state requests
        this.io.on('connection', (socket) => {
            socket.on('request_initial_state', () => {
                socket.emit('all_ambulances_update', this.ambulances);
                socket.emit('hospitals_update', this.hospitals);
                socket.emit('pending_incidents_update', Array.from(this.pendingIncidents.values()));
                socket.emit('auto_dispatch_status', { enabled: this.autoDispatch });
                socket.emit('history_update', this.resolvedHistory.slice(-20)); // Last 20
            });
        });

        // Dynamic Traffic Update
        setInterval(() => {
            this.trafficFactor = 0.5 + Math.random(); // Randomly fluctuates traffic
            this.io.emit('traffic_update', { factor: this.trafficFactor });
        }, 10000);
    }

    start() {
        this.simulatorActive = true;
        console.log('[SIMULATOR] Engine Started');
        clearInterval(this.sosInterval);
        clearInterval(this.movementInterval);
        this.sosInterval = setInterval(() => this.generateRandomSOS(), 25000);
        this.movementInterval = setInterval(() => this.updateSimulationStep(), 1500);
        this.broadcastState();
    }

    toggleAutoDispatch(enabled) {
        this.autoDispatch = enabled;
        this.io.emit('auto_dispatch_status', { enabled: this.autoDispatch });
    }

    stop() {
        this.simulatorActive = false;
        clearInterval(this.sosInterval);
        clearInterval(this.movementInterval);
    }

    broadcastState() {
        this.io.emit('all_ambulances_update', this.ambulances);
        this.io.emit('hospitals_update', this.hospitals);
        this.io.emit('pending_incidents_update', Array.from(this.pendingIncidents.values()));
    }

    handleRealSOS(incident) {
        const incidentId = incident.id;
        const fullIncident = {
            ...incident,
            status: 'pending',
            id: incidentId
        };

        this.pendingIncidents.set(incidentId, fullIncident);
        const isRealUser = !incident.isDemo && incident.userProfile?.name && incident.userProfile.name !== 'Demo Incident';

        if (isRealUser) {
            this.io.emit('new_emergency', fullIncident);
        }

        if (this.autoDispatch && this.simulatorActive) {
            if (fullIncident.status !== 'pending') return;
            setTimeout(() => {
                const refreshed = this.pendingIncidents.get(incidentId);
                if (refreshed && refreshed.status === 'pending') {
                    this.autoAssignAmbulance(incidentId, refreshed);
                }
            }, 1000);
        }
    }

    async generateRandomSOS() {
        if (!this.simulatorActive) return;
        if (Math.random() > 0.6) return;

        const city = INDIA_CITIES[Math.floor(Math.random() * INDIA_CITIES.length)];
        const lat = city.lat + (Math.random() - 0.5) * 0.15;
        const lng = city.lng + (Math.random() - 0.5) * 0.15;

        const types = ['Cardiac Arrest', 'Respiratory Distress', 'Road Accident', 'Minor Trauma'];
        const type = types[Math.floor(Math.random() * types.length)];

        const incident = {
            isDemo: true,
            citizenId: `DEMO-${Math.floor(Math.random() * 9000) + 1000}`,
            userProfile: { name: 'Automated Alert' },
            location: { lat, lng, address: `Simulated Alert in ${city.name}` },
            city: city.name,
            type,
            timestamp: new Date().toISOString()
        };

        try {
            const API_URL = process.env.API_URL || 'http://127.0.0.1:4000';
            const response = await axios.post(`${API_URL}/api/sos`, incident);
            const incidentId = response.data.id;
            this.pendingIncidents.set(incidentId, { ...incident, id: incidentId, status: 'pending' });
            this.broadcastState();
        } catch (e) {
            console.error('[SIMULATOR] Dummy SOS Fail:', e.message);
        }
    }

    checkSurgeAndReleaseUnits(cityName) {
        const pendingInCity = Array.from(this.pendingIncidents.values()).filter(p => p.city === cityName).length;
        const availableInCity = this.ambulances.filter(a => a.status === 'available' && a.city === cityName).length;

        if (pendingInCity > availableInCity) {
            const reserveIndex = this.reserveUnits.findIndex(r => r.city === cityName);
            if (reserveIndex !== -1) {
                const unit = this.reserveUnits.splice(reserveIndex, 1)[0];
                const hospital = this.hospitals.find(h => h.id === unit.baseHospitalId);

                this.ambulances.push({
                    ...unit,
                    location: { ...hospital.location },
                    status: 'available'
                });
                this.broadcastState();
            }
        }
    }

    async autoAssignAmbulance(incidentId, incident) {
        try {
            const available = this.ambulances.filter(a => a.status === 'available');
            if (available.length === 0) return;

            // Fetch smart recommendations from AI Router
            const AI_ROUTER_URL = process.env.AI_ROUTER_URL || 'http://127.0.0.1:8000';
            const response = await axios.post(`${AI_ROUTER_URL}/find-nearest`, {
                emergency: {
                    id: incidentId,
                    location: incident.location,
                    type: incident.type,
                    priority: incident.priority || 3
                },
                ambulances: available.map(a => ({
                    id: a.id,
                    location: a.location,
                    status: a.status,
                    equipment: a.equipment,
                    type: a.type
                }))
            });

            if (response.data.success && response.data.recommendations.length > 0) {
                const bestMatch = response.data.recommendations[0];
                console.log(`[AI-SMART-DISPATCH] Auto-assigning ${bestMatch.ambulance_id} to ${incidentId} (Score: ${bestMatch.final_dispatch_score})`);
                this.assignAmbulance(incidentId, bestMatch.ambulance_id, incident.location);
            } else {
                // Fallback to simple distance if AI Router fails to provide a good match
                this.simpleAutoAssign(incidentId, incident);
            }
        } catch (e) {
            console.error('[AI-SMART-DISPATCH] Router unavailable, falling back to simple assignment:', e.message);
            this.simpleAutoAssign(incidentId, incident);
        }
    }

    simpleAutoAssign(incidentId, incident) {
        const localAvailable = this.ambulances.filter(a => a.status === 'available' && a.city === incident.city);
        if (localAvailable.length > 0) {
            const bestAmb = localAvailable.sort((a, b) => {
                const d1 = Math.sqrt(Math.pow(a.location.lat - incident.location.lat, 2) + Math.pow(a.location.lng - incident.location.lng, 2));
                const d2 = Math.sqrt(Math.pow(b.location.lat - incident.location.lat, 2) + Math.pow(b.location.lng - incident.location.lng, 2));
                return d1 - d2;
            })[0];
            this.assignAmbulance(incidentId, bestAmb.id, incident.location);
        }
    }

    assignAmbulance(incidentId, ambId, targetLocation) {
        const amb = this.ambulances.find(a => a.id === ambId);
        if (!amb) return;

        amb.status = 'busy';
        this.activeIncidents.set(ambId, {
            incidentId,
            targetLocation,
            status: 'enroute_patient',
            patientLocation: targetLocation,
            path: [],
            pathIndex: 0,
            startTime: Date.now()
        });

        this.fetchRoute(ambId, amb.location, targetLocation);

        const incident = this.pendingIncidents.get(incidentId);
        if (incident) {
            incident.status = 'dispatched';
            incident.ambulanceId = ambId;
        }

        this.io.emit('ambulance_assigned', { ambId, incidentId, status: 'enroute', location: targetLocation, ambulance: amb });
        this.broadcastState();
    }

    async fetchRoute(ambId, start, end) {
        try {
            const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await axios.get(url);

            if (response.data.code === 'Ok') {
                const coordinates = response.data.routes[0].geometry.coordinates;
                const path = coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                const active = this.activeIncidents.get(ambId);
                if (active) {
                    active.path = path;
                    active.pathIndex = 0;
                    
                    const incident = this.pendingIncidents.get(active.incidentId);
                    if (incident) {
                        incident.path = path;
                    }
                    this.broadcastState();
                }
            }
        } catch (e) {
            console.error(`[SIMULATOR] Route fetch fail for ${ambId}:`, e.message);
        }
    }

    updateSimulationStep() {
        if (!this.simulatorActive) return;

        const baseSpeed = 0.0022;
        const speed = baseSpeed * this.trafficFactor;

        this.ambulances.forEach(amb => {
            const active = this.activeIncidents.get(amb.id);
            if (!active) {
                if (amb.status === 'available' && amb.location) {
                    const baseHosp = this.hospitals.find(h => h.id === amb.baseHospitalId);
                    if (baseHosp && baseHosp.location) {
                        const distH = Math.sqrt(Math.pow(baseHosp.location.lat - amb.location.lat, 2) + Math.pow(baseHosp.location.lng - amb.location.lng, 2));
                        if (distH > 0.001) {
                            this.moveTowards(amb, baseHosp.location, 0.0015);
                        }
                    }
                }
                return;
            }

            if (active.path && active.path.length > 0) {
                // Keep dashboard path updated during movement
                const incident = this.pendingIncidents.get(active.incidentId);
                if (incident) {
                    incident.path = [ { ...amb.location }, ...active.path.slice(active.pathIndex) ];
                }
                const targetPoint = active.path[active.pathIndex];
                if (!targetPoint || !amb.location) return;

                const distToPoint = Math.sqrt(Math.pow(targetPoint.lat - amb.location.lat, 2) + Math.pow(targetPoint.lng - amb.location.lng, 2));

                if (distToPoint < 0.0005) {
                    active.pathIndex++;
                    if (active.pathIndex >= active.path.length) {
                        this.handleStateTransition(amb, active);
                    }
                } else {
                    this.moveTowards(amb, targetPoint, speed * 0.8);
                }
            } else {
                const dist = Math.sqrt(Math.pow(active.targetLocation.lat - amb.location.lat, 2) + Math.pow(active.targetLocation.lng - amb.location.lng, 2));
                if (dist < 0.001) {
                    amb.location = { ...active.targetLocation };
                    this.handleStateTransition(amb, active);
                } else {
                    this.moveTowards(amb, active.targetLocation, speed);
                }
            }

            if (active.status === 'pickup' || active.status === 'enroute_hospital') {
                const incident = this.pendingIncidents.get(active.incidentId);
                if (incident) {
                    incident.location = { ...amb.location };
                    incident.status = active.status;
                }
            }
        });

        this.broadcastState();
    }

    moveTowards(unit, target, speed) {
        const distLat = target.lat - unit.location.lat;
        const distLng = target.lng - unit.location.lng;
        const distance = Math.sqrt(distLat * distLat + distLng * distLng);

        if (distance <= speed) {
            unit.location.lat = target.lat;
            unit.location.lng = target.lng;
            return;
        }

        const prevLat = unit.location.lat;
        const prevLng = unit.location.lng;
        
        unit.location.lat += (distLat / distance) * speed;
        unit.location.lng += (distLng / distance) * speed;

        // Calculate heading
        unit.heading = Math.atan2(unit.location.lat - prevLat, unit.location.lng - prevLng) * (180 / Math.PI);
    }

    handleStateTransition(amb, active) {
        switch (active.status) {
            case 'enroute_patient':
                active.status = 'pickup';
                this.io.emit('ambulance_status_update', { ambId: amb.id, status: 'pickup', incidentId: active.incidentId });
                setTimeout(() => {
                    const nearestHosp = this.findNearestHospital(amb.location);
                    if (nearestHosp) {
                        active.status = 'enroute_hospital';
                        active.targetLocation = nearestHosp.location;
                        active.hospitalId = nearestHosp.id;
                        this.io.emit('ambulance_status_update', { ambId: amb.id, status: 'enroute_hospital', incidentId: active.incidentId });
                        this.fetchRoute(amb.id, amb.location, nearestHosp.location);
                    }
                }, 4000);
                break;

            case 'enroute_hospital':
                active.status = 'dropoff';
                this.io.emit('ambulance_status_update', { ambId: amb.id, status: 'dropoff', incidentId: active.incidentId });
                setTimeout(() => {
                    this.completeIncident(amb, active);
                }, 4000);
                break;
        }
    }

    findNearestHospital(loc) {
        return this.hospitals.filter(h => h.beds > 0).sort((a, b) => {
            return Math.sqrt(Math.pow(a.location.lat - loc.lat, 2) + Math.pow(a.location.lng - loc.lng, 2)) -
                Math.sqrt(Math.pow(b.location.lat - loc.lat, 2) + Math.pow(b.location.lng - loc.lng, 2));
        })[0];
    }

    completeIncident(amb, active) {
        const hosp = this.hospitals.find(h => h.id === active.hospitalId);
        if (hosp) hosp.beds--;

        const incident = this.pendingIncidents.get(active.incidentId);
        if (incident) {
            const resolution = {
                ...incident,
                status: 'resolved',
                resolutionTime: new Date().toISOString(),
                responseTimeMs: Date.now() - active.startTime,
                hospitalName: hosp ? hosp.name : 'Unknown'
            };
            this.resolvedHistory.push(resolution);
        }

        amb.status = 'available';
        this.activeIncidents.delete(amb.id);
        this.pendingIncidents.delete(active.incidentId);

        this.io.emit('ambulance_status_update', { ambId: amb.id, status: 'available' });
        this.io.emit('history_update', this.resolvedHistory.slice(-20));
        this.broadcastState();
    }

    async manualAssign(incidentId, ambId) {
        const incident = this.pendingIncidents.get(incidentId);
        if (!incident) return { success: false, message: 'Incident not found' };

        let amb;
        if (ambId) {
            amb = this.ambulances.find(a => a.id === ambId);
            if (!amb || amb.status !== 'available') return { success: false, message: 'Ambulance busy' };
        } else {
            const available = this.ambulances.filter(a => a.status === 'available');
            if (available.length === 0) return { success: false, message: 'No ambulances available' };

            amb = available.sort((a, b) => {
                const d1 = Math.sqrt(Math.pow(a.location.lat - incident.location.lat, 2) + Math.pow(a.location.lng - incident.location.lng, 2));
                const d2 = Math.sqrt(Math.pow(b.location.lat - incident.location.lat, 2) + Math.pow(b.location.lng - incident.location.lng, 2));
                return d1 - d2;
            })[0];
        }

        this.assignAmbulance(incidentId, amb.id, incident.location);
        return { success: true, ambulanceId: amb.id };
    }
}

module.exports = EROSSimulator;
