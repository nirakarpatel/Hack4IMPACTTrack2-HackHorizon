

# Hack4IMPACTTrack2-HackHorizon

Team Information:

Team Name: Hack Horizon

Members Name:
              1. Nirakar Patel
              2. Jiru Pranita Krishna Reddy
              3. Aditya Sekhar Das
              4. Swadhin Dibya Jyoti

Domain: AI and Automation in healthcare

Approved Problem Statement : EROS – An AI powered unified emergency platform designed to reduce response delays and save lives.


## Architecture

- **Backend Engine (`services/backend-engine`)**: Node.js + Express + Socket.io + Firestore. Handles real-time SOS broadcasting and persistence.
- **AI Router (`services/ai-router`)**: Python + FastAPI. Implements Haversine routing for nearest ambulance assignment.
- **Dispatch Dashboard (`apps/dispatch-dashboard`)**: Next.js 15 + TailwindCSS. High-visibility command center for emergency dispatchers.

## Database Layer
- **Firebase Firestore**: Real-time sync of active SOS calls and GPS tracking.
- **PostgreSQL**: Long-term storage of resolved incidents and hospital data.

## Getting Started

### Backend Engine
```bash
cd services/backend-engine
npm install
npm start
```

### AI Router
```bash
cd services/ai-router
pip install -r requirements.txt
python main.py
```

### Dispatch Dashboard
```bash
cd apps/dispatch-dashboard
npm install
npm run dev
```

## Key Features
- **Real-time SOS Monitoring**
- **Nearest Ambulance Intelligent Routing**
- **Live Statistics & Hospital Capacity Tracking**
- **Hybrid Data Persistence**
