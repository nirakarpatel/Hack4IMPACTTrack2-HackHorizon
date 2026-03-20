# EROS Deployment Guide 🚀

To deploy the full EROS system and make it publicly accessible, follow these steps to link your GitHub repository to Vercel and Render.

## 1. Deploy the Backend (Render.com)
The backend simulator requires a persistent server for WebSockets.

1.  Create a new **Web Service** on [Render](https://render.com).
2.  Connect your GitHub repo (`github.com/nirakarpatel/Hack4IMPACTTrack2-HackHorizon`).
3.  Set **Root Directory** to `services/backend-engine`.
4.  Set **Build Command** to `npm install`.
5.  Set **Start Command** to `node index.js`.
6.  Add **Environment Variables**:
    *   `PORT`: `4000`
7.  **Public URL**: Note your service URL (e.g., `https://eros-backend.onrender.com`).

## 2. Deploy the Dispatch Dashboard (Vercel)
1.  Create a new Project on [Vercel](https://vercel.com).
2.  Connect your GitHub repo.
3.  Set **Root Directory** to `apps/dispatch-dashboard`.
4.  **Framework Preset**: Change from Next.js to **Vite**.
5.  Add **Environment Variables** (CRITICAL for public access):
    *   `VITE_BACKEND_URL`: (Your Render URL, e.g., `https://eros-backend.onrender.com`)
    *   `VITE_SOCKET_URL`: (Your Render URL, e.g., `https://eros-backend.onrender.com`)

## 3. Deploy the Citizen SOS WebApp (Vercel)
1.  Create another new Project on Vercel.
2.  Connect your GitHub repo.
3.  Set **Root Directory** to `mobile/citizen-sos`.
4.  **Framework Preset**: **Vite**.
5.  Add **Environment Variables**:
    *   `VITE_BACKEND_URL`: (Your Render URL, e.g., `https://eros-backend.onrender.com`)

---

### Making it Public 🌍
Once these are deployed, anyone with the Vercel links can:
1.  Open the **Citizen SOS** link on their phone.
2.  Register and trigger a "Slide to SOS".
3.  Anyone with the **Dispatch Dashboard** link will see the incident and the ambulance move in real-time across the globe!

### Sync Verification
1.  Trigger an SOS from the Citizen WebApp.
2.  Check the Dispatch Dashboard—it should appear instantly!
