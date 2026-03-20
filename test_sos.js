const http = require('http');

const data = JSON.stringify({
  citizenId: "9998887776",
  location: { lat: 28.6139, lng: 77.2090, city: "Delhi" },
  type: "Respiratory Distress",
  userProfile: {
    name: "Test Jane",
    bloodGroup: "O-",
    heartRate: "120",
    spo2: "85",
    bloodPressure: "150/95",
    city: "Delhi",
    state: "Delhi"
  }
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/sos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  },
  res => {
    res.on('data', d => process.stdout.write(d));
  }
);
req.on('error', console.error);
req.write(data);
req.end();
