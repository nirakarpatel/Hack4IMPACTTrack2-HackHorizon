from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import math
import httpx
import json
import re

app = FastAPI(title="EROS AI Routing Engine - Pro V2")

# --- Ollama Configuration ---
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral"  # Change to "phi3:mini" for low-RAM machines


# --- Data Models ---

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class Hospital(BaseModel):
    id: str
    name: str
    location: Location
    capacity_percent: float # 0 to 100
    specialties: List[str] # e.g., ["Trauma", "Cardiac", "ICU"]

class Ambulance(BaseModel):
    id: str
    location: Location
    status: str # 'available', 'busy', 'offline'
    equipment: List[str] # e.g., ["ACLS", "Ventilator", "Oxygen"]
    type: str # 'Basic', 'Advanced', 'ICU'

class Emergency(BaseModel):
    id: str
    location: Location
    type: str # 'Cardiac', 'Trauma', 'Minor', etc.
    priority: int # 1 (Critical) to 5 (Low)

class TriageRequest(BaseModel):
    description: str
    user_vitals: Optional[Dict] = None  # e.g. {"heartRate": "120", "spo2": "85"}

class CopilotRequest(BaseModel):
    message: str
    context: Optional[Dict] = None  # current incidents, ambulances, etc.


# --- Utility Functions ---

def calculate_haversine_distance(loc1: Location, loc2: Location) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [loc1.lng, loc1.lat, loc2.lng, loc2.lat])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r


# --- Keyword-based Fallback Triage ---

KEYWORD_RULES = [
    {
        "keywords": ["chest pain", "heart attack", "cardiac", "heart", "not breathing", "collapsed", "unconscious", "unresponsive"],
        "type": "Cardiac Arrest",
        "priority": 1,
        "equipment": ["ACLS", "AED", "Oxygen"]
    },
    {
        "keywords": ["breathing", "respiratory", "asthma", "choking", "suffocating", "oxygen", "wheeze"],
        "type": "Respiratory Distress",
        "priority": 2,
        "equipment": ["Oxygen", "Ventilator"]
    },
    {
        "keywords": ["accident", "crash", "collision", "hit by", "bleeding", "fracture", "broken", "injury", "wound", "cut"],
        "type": "Road Accident",
        "priority": 1,
        "equipment": ["First Aid", "Oxygen", "ACLS"]
    },
    {
        "keywords": ["burn", "fire", "scald", "flame"],
        "type": "Burn Injury",
        "priority": 2,
        "equipment": ["First Aid", "Oxygen"]
    },
    {
        "keywords": ["stroke", "paralysis", "slurred speech", "face drooping", "numbness"],
        "type": "Stroke",
        "priority": 1,
        "equipment": ["ACLS", "Patient Monitor", "Oxygen"]
    },
    {
        "keywords": ["faint", "dizzy", "fell", "fall", "slip", "minor", "sprain", "bruise"],
        "type": "Minor Trauma",
        "priority": 4,
        "equipment": ["First Aid"]
    },
    {
        "keywords": ["poison", "overdose", "swallow", "toxic", "drug"],
        "type": "Poisoning/Overdose",
        "priority": 2,
        "equipment": ["ACLS", "Syringe Pump", "Oxygen"]
    },
    {
        "keywords": ["seizure", "convulsion", "fit", "epilepsy"],
        "type": "Seizure",
        "priority": 2,
        "equipment": ["Oxygen", "Patient Monitor"]
    },
    {
        "keywords": ["pregnant", "delivery", "labor", "baby", "birth", "contractions"],
        "type": "Obstetric Emergency",
        "priority": 1,
        "equipment": ["First Aid", "Oxygen"]
    },
]

def fallback_triage(description: str) -> dict:
    """Keyword-based triage when Ollama is unavailable."""
    desc_lower = description.lower()
    
    best_match = None
    best_score = 0
    
    for rule in KEYWORD_RULES:
        score = sum(1 for kw in rule["keywords"] if kw in desc_lower)
        if score > best_score:
            best_score = score
            best_match = rule
    
    if best_match:
        return {
            "type": best_match["type"],
            "priority": best_match["priority"],
            "summary": f"Keyword-based classification: {best_match['type']}",
            "recommended_equipment": best_match["equipment"],
            "ai_source": "fallback_keywords"
        }
    
    return {
        "type": "Medical Emergency",
        "priority": 3,
        "summary": "Unable to classify — dispatching general medical response.",
        "recommended_equipment": ["First Aid", "Oxygen"],
        "ai_source": "fallback_default"
    }


# --- API Endpoints ---

@app.get("/health")
def health_check():
    return {
        "status": "online", 
        "engine": "EROS-Smart-Router-V2",
        "features": ["Capacity-Aware", "Equipment-Match", "Multi-Factor Scoring", "Keyword-Triage"]
    }


@app.post("/find-nearest")
def find_nearest_ambulance(
    emergency: Emergency, 
    ambulances: List[Ambulance], 
    hospitals: Optional[List[Hospital]] = None
):
    if not ambulances:
        raise HTTPException(status_code=400, detail="No ambulances provided")

    available_ambulances = [a for a in ambulances if a.status == "available"]
    
    if not available_ambulances:
        return {"success": False, "message": "No available ambulances within range"}

    scored_ambulances = []
    
    for amb in available_ambulances:
        dist = calculate_haversine_distance(emergency.location, amb.location)
        
        equipment_score = 1.0
        required_gear = []
        if emergency.type == "Cardiac":
            required_gear = ["ACLS", "Ventilator"]
        elif emergency.type == "Respiratory":
            required_gear = ["Oxygen", "Ventilator"]
        
        if required_gear:
            match_count = sum(1 for gear in required_gear if gear in amb.equipment)
            equipment_score = match_count / len(required_gear)

        base_score = dist
        penalty = (1.0 - equipment_score) * 10
        
        final_score = base_score + penalty

        scored_ambulances.append({
            "ambulance_id": amb.id,
            "type": amb.type,
            "distance_km": round(dist, 2),
            "estimated_time_min": round(dist * 2.5, 1),
            "equipment_match_score": round(equipment_score * 100, 0),
            "final_dispatch_score": round(final_score, 2),
            "reasoning": f"Located {round(dist, 1)}km away with {int(equipment_score*100)}% equipment match."
        })

    sorted_ambulances = sorted(scored_ambulances, key=lambda x: x["final_dispatch_score"])

    return {
        "success": True,
        "emergency_id": emergency.id,
        "recommendations": sorted_ambulances[:3]
    }


@app.post("/triage")
async def ai_triage(request: TriageRequest):
    """Keyword-based triage for EROS Engine."""
    description = request.description.strip()
    if not description:
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    
    # Use keyword-based classification
    result = fallback_triage(description)
    return {"success": True, "triage": result}


@app.post("/copilot")
async def dispatch_copilot(request: CopilotRequest):
    """Data-aware dispatch copilot for EROS Engine."""
    message = request.message.strip()
    context = request.context or {}
    
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Extract Data from Context
    ambulances = context.get('ambulances', [])
    pending = context.get('pending_incidents', [])
    resolved_count = context.get('resolved_count', 0)
    
    total_amb = len(ambulances)
    available_amb = len([a for a in ambulances if a.get('status') == 'available'])
    busy_amb = len([a for a in ambulances if a.get('status') == 'busy'])
    
    pending_count = len(pending)
    critical_count = len([i for i in pending if i.get('priority', 3) <= 2])

    msg_lower = message.lower()
    
    # 1. Ambulance Availability Queries
    if "available" in msg_lower and "ambulance" in msg_lower:
        if total_amb == 0:
            response = "I currently don't see any ambulances registered in the system."
        else:
            response = f"There are currently {available_amb} ambulances available out of a total fleet of {total_amb}. {busy_amb} units are currently on active missions."
            
    # 2. Incident/Emergency Queries
    elif "incident" in msg_lower or "emergency" in msg_lower or "queue" in msg_lower:
        if pending_count == 0:
            response = f"The incident queue is currently clear. We have successfully resolved {resolved_count} emergencies in this session."
        else:
            response = f"There are {pending_count} active incidents in the queue. {critical_count} of these are flagged as high priority. You can see them highlighted in red on the dashboard."

    # 3. Priority/Protocol Queries
    elif "priority" in msg_lower or "prioritize" in msg_lower:
        response = f"Standard priority order: 1) Cardiac/Stroke/Respiratory → 2) Road Accidents → 3) Burns. With {pending_count} pending cases, I recommend clearing the {critical_count} critical alerts first using the nearest available units."
        
    # 4. Hospital Queries
    elif "hospital" in msg_lower:
        response = "Dispatch to the nearest hospital matching the emergency type. The dashboard map icons show live bed availability for all Odisha-based facilities."
        
    # 5. Default Response
    else:
        response = f"I am monitoring the live EROS feed. We have {available_amb} units ready and {pending_count} active emergencies. How can I assist with dispatching?"

    return {
        "success": True,
        "response": response,
        "ai_source": "live_data_engine"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
