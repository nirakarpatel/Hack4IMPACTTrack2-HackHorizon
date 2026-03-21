const INDIA_CITIES = [
    { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
    { name: 'Cuttack', lat: 20.4625, lng: 85.8830 },
    { name: 'Puri', lat: 19.8177, lng: 85.8286 },
    { name: 'Rourkela', lat: 22.2492, lng: 84.8828 },
    { name: 'Sambalpur', lat: 21.4682, lng: 83.9754 },
    { name: 'Berhampur', lat: 19.3150, lng: 84.7941 },
    { name: 'Balasore', lat: 21.4950, lng: 86.9427 }
];

const HOSPITAL_TEMPLATES = [
    { name: 'Apollo Hospital', beds: 50 },
    { name: 'Fortis Healthcare', beds: 40 },
    { name: 'Max Super Speciality', beds: 45 },
    { name: 'Manipal Hospital', beds: 35 },
    { name: 'AIIMS', beds: 100 },
    { name: 'Care Hospitals', beds: 30 },
    { name: 'Medanta The Medicity', beds: 60 },
    { name: 'St. Johns Medical College', beds: 40 },
    { name: 'KIMS Hospital', beds: 55 },
    { name: 'SUM Hospital', beds: 45 },
    { name: 'Kalinga Hospital', beds: 35 },
    { name: 'Hi-Tech Medical College', beds: 50 }
];

const SPECIFIC_HOSPITALS = {
    'Bhubaneswar': [
        { name: 'IMS & SUM Hospital', location: { lat: 20.2859, lng: 85.7720 }, beds: 100 },
        { name: 'KIMS Hospital', location: { lat: 20.3534, lng: 85.8154 }, beds: 80 },
        { name: 'Kalinga Hospital', location: { lat: 20.3133, lng: 85.8189 }, beds: 60 },
        { name: 'Apollo Hospital Bhubaneswar', location: { lat: 20.3015, lng: 85.8340 }, beds: 70 },
        { name: 'Manipal Hospital (AMRI)', location: { lat: 20.2644, lng: 85.7781 }, beds: 50 },
        { name: 'CARE Hospital Bhubaneswar', location: { lat: 20.3245, lng: 85.8188 }, beds: 55 }
    ],
    'Cuttack': [
        { name: 'SCB Medical College & Hospital', location: { lat: 20.4789, lng: 85.8778 }, beds: 150 },
        { name: 'Ashwini Hospital', location: { lat: 20.5050, lng: 85.8620 }, beds: 80 },
        { name: 'Shanti Memorial Hospital', location: { lat: 20.4670, lng: 85.8810 }, beds: 60 }
    ],
    'Puri': [
        { name: 'District Headquarters Hospital', location: { lat: 19.8090, lng: 85.8220 }, beds: 60 },
        { name: 'ESI Hospital Puri', location: { lat: 19.8250, lng: 85.8450 }, beds: 40 }
    ],
    'Rourkela': [
        { name: 'Ispat General Hospital (IGH)', location: { lat: 22.2510, lng: 84.8450 }, beds: 120 },
        { name: 'Rourkela Government Hospital', location: { lat: 22.2350, lng: 84.8650 }, beds: 70 }
    ],
    'Sambalpur': [
        { name: 'VIMSAR (Burla)', location: { lat: 21.4930, lng: 83.8820 }, beds: 130 },
        { name: 'Sambalpur District Hospital', location: { lat: 21.4650, lng: 83.9850 }, beds: 60 }
    ],
    'Berhampur': [
        { name: 'MKCG Medical College', location: { lat: 19.3110, lng: 84.8050 }, beds: 140 },
        { name: 'City Hospital Berhampur', location: { lat: 19.3170, lng: 84.7920 }, beds: 60 }
    ],
    'Balasore': [
        { name: 'Fakir Mohan Medical College', location: { lat: 21.4740, lng: 86.9230 }, beds: 90 },
        { name: 'Jyothi Hospital Balasore', location: { lat: 21.5030, lng: 86.9410 }, beds: 50 }
    ]
};

function generateIndiaHospitals() {
    const hospitals = [];
    let idCounter = 1;

    INDIA_CITIES.forEach(city => {
        // Add specific hospitals if they exist for this city
        if (SPECIFIC_HOSPITALS[city.name]) {
            SPECIFIC_HOSPITALS[city.name].forEach(spec => {
                hospitals.push({
                    id: `HOSP-${idCounter++}`,
                    name: spec.name,
                    location: spec.location,
                    city: city.name,
                    beds: Math.floor(Math.random() * spec.beds) + 10,
                    totalBeds: spec.beds + 10
                });
            });
        }
        
        // Add a few more template-based hospitals but keep them strictly on land
        HOSPITAL_TEMPLATES.slice(0, 3).forEach((template, index) => {
            // Tighten offset to 0.03 (~3km) to stay on land in coastal cities
            const lat = city.lat + (Math.random() - 0.5) * 0.06;
            const lng = city.lng + (Math.random() - 0.5) * 0.06;

            hospitals.push({
                id: `HOSP-${idCounter++}`,
                name: `${template.name} - ${city.name} Unit`,
                location: { lat, lng },
                city: city.name,
                beds: Math.floor(Math.random() * template.beds) + 10,
                totalBeds: template.beds + 10
            });
        });
    });

    return hospitals;
}

module.exports = { INDIA_CITIES, generateIndiaHospitals };
