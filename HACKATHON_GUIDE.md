# EROS: Emergency Response Orchestration System
## Hackathon Demo Guide 


### 1. Launch Sequence
Make sure all three services are running in their terminals:
- **Backend (Port 4000)**: `node index.js`
- **Citizen SOS App (Port 3001)**: `npm run dev`
- **Dispatch Dashboard (Port 3000)**: `npm run dev`

### 2. The Demo Flow
1. **The Citizen Arrival**: Open [localhost:3001](http://localhost:3001). Register your name and medical details.
2. **The Incident**: Keep the **Dashboard** ([localhost:3000](http://localhost:3000)) open on your main screen. Tap the **SOS** button in the app.
3. **The Identity Match**: Watch the dashboard instantly register a **"Verified Citizen"** with your name.
4. **The Rescue**:
   - The simulator automatically dispatches the nearest unit.
   - The **Citizen App** transitions to a tracker showing the unit ID and status.
   - Watch the map centering dynamically as the ambulance approaches.
5. **The Completion**: The ambulance will pick you up (status "Ambulance Arrived") and take you to the nearest hospital mapped in your city.

### 3. Key Tech Highlights for Judges
- **Reactive Engine**: Simulator prioritizes real websocket input over dummy noise.
- **Smart Routing**: Backend calculates the nearest ambulance from a fleet of 80+ units across India.
- **Digital Health Bridge**: Real-time pass-through of medical profiles (Blood Type, Allergies) from user to dispatcher.
- **Uber-style UX**: High-end Leaflet map with auto-bounding and dynamic state transitions.

