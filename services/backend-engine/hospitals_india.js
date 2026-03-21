const INDIA_CITIES = [
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
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
        } else {
            // Otherwise generate from templates
            HOSPITAL_TEMPLATES.forEach((template, index) => {
                // Randomize location around city center (within ~10-15km)
                const lat = city.lat + (Math.random() - 0.5) * 0.15;
                const lng = city.lng + (Math.random() - 0.5) * 0.15;

                hospitals.push({
                    id: `HOSP-${idCounter++}`,
                    name: `${template.name} - ${city.name}`,
                    location: { lat, lng },
                    city: city.name,
                    beds: Math.floor(Math.random() * template.beds) + 10,
                    totalBeds: template.beds + 10
                });
            });
        }
    });

    return hospitals;
}

module.exports = { INDIA_CITIES, generateIndiaHospitals };
