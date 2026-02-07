"""
Relief Operations MCP Server
============================

Custom MCP server exposing tools for disaster relief logistics.
Part of the Aegis-1 Climate Research and Disaster Relief System.

Run with: python relief_ops.py
"""

import json
import math
import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from dedalus_mcp import MCPServer, tool, ToolResult

# Configuration from environment
MCP_HOST = os.getenv("HOST", "0.0.0.0")
MCP_PORT = int(os.getenv("PORT", "8000"))
MCP_SERVER_NAME = os.getenv("MCP_SERVER_NAME", "relief-ops")

# Initialize the MCP Server
server = MCPServer(MCP_SERVER_NAME, version="1.0.0")


class DisasterType(str, Enum):
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    HURRICANE = "hurricane"
    WILDFIRE = "wildfire"
    TSUNAMI = "tsunami"
    DROUGHT = "drought"
    LANDSLIDE = "landslide"


class SeverityLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"
    CATASTROPHIC = "catastrophic"


# Supply calculation constants based on humanitarian standards
SUPPLY_RATIOS = {
    "flood": {
        "water_liters_per_person_per_day": 7.5,  # Higher due to contamination risk
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 50,
        "shelter_units_per_100": 25,
        "water_purification_tablets_per_person": 100,
        "severity_multiplier": {"low": 1.0, "moderate": 1.3, "high": 1.6, "critical": 2.0, "catastrophic": 2.5}
    },
    "earthquake": {
        "water_liters_per_person_per_day": 5.0,
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 150,  # Higher due to injuries
        "shelter_units_per_100": 40,   # Higher due to building damage
        "search_rescue_teams_per_10000": 5,
        "severity_multiplier": {"low": 1.0, "moderate": 1.4, "high": 1.8, "critical": 2.2, "catastrophic": 3.0}
    },
    "hurricane": {
        "water_liters_per_person_per_day": 6.0,
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 40,
        "shelter_units_per_100": 35,
        "tarps_per_household": 2,
        "severity_multiplier": {"low": 1.0, "moderate": 1.2, "high": 1.5, "critical": 1.9, "catastrophic": 2.4}
    },
    "wildfire": {
        "water_liters_per_person_per_day": 8.0,  # Smoke exposure
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 60,  # Respiratory issues
        "shelter_units_per_100": 30,
        "respirator_masks_per_person": 5,
        "severity_multiplier": {"low": 1.0, "moderate": 1.3, "high": 1.7, "critical": 2.1, "catastrophic": 2.8}
    },
    "tsunami": {
        "water_liters_per_person_per_day": 7.5,
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 100,
        "shelter_units_per_100": 45,
        "body_bags_per_1000": 50,  # Unfortunate reality
        "severity_multiplier": {"low": 1.0, "moderate": 1.5, "high": 2.0, "critical": 2.5, "catastrophic": 3.5}
    },
    "drought": {
        "water_liters_per_person_per_day": 15.0,  # Critical water needs
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 30,
        "shelter_units_per_100": 5,
        "water_trucking_capacity_liters": 10000,
        "severity_multiplier": {"low": 1.0, "moderate": 1.2, "high": 1.4, "critical": 1.6, "catastrophic": 2.0}
    },
    "landslide": {
        "water_liters_per_person_per_day": 5.0,
        "food_kcal_per_person_per_day": 2100,
        "medical_kits_per_1000": 80,
        "shelter_units_per_100": 35,
        "excavation_equipment_units": 10,
        "severity_multiplier": {"low": 1.0, "moderate": 1.3, "high": 1.6, "critical": 2.0, "catastrophic": 2.5}
    }
}


@server.tool(
    name="calculate_supply_needs",
    description="Calculate required relief supplies based on disaster type, affected population, and severity. Returns detailed JSON with food, water, medical kits, shelter, and specialized equipment needs."
)
async def calculate_supply_needs(
    disaster_type: str,
    population_affected: int,
    severity: str = "moderate",
    duration_days: int = 14
) -> Dict[str, Any]:
    """
    Calculate relief supply requirements based on humanitarian standards.
    
    Args:
        disaster_type: Type of disaster (flood, earthquake, hurricane, wildfire, tsunami, drought, landslide)
        population_affected: Number of people affected
        severity: Severity level (low, moderate, high, critical, catastrophic)
        duration_days: Expected duration of relief operations in days
        
    Returns:
        Detailed supply requirements with quantities and priorities
    """
    disaster_type = disaster_type.lower()
    severity = severity.lower()
    
    if disaster_type not in SUPPLY_RATIOS:
        return ToolResult(
            success=False,
            error=f"Unknown disaster type: {disaster_type}. Valid types: {list(SUPPLY_RATIOS.keys())}"
        )
    
    ratios = SUPPLY_RATIOS[disaster_type]
    multiplier = ratios["severity_multiplier"].get(severity, 1.3)
    
    # Calculate base supplies
    water_total = ratios["water_liters_per_person_per_day"] * population_affected * duration_days * multiplier
    food_total_kcal = ratios["food_kcal_per_person_per_day"] * population_affected * duration_days * multiplier
    medical_kits = int((population_affected / 1000) * ratios["medical_kits_per_1000"] * multiplier)
    shelter_units = int((population_affected / 100) * ratios["shelter_units_per_100"] * multiplier)
    
    # Household calculations (avg 4.5 people per household)
    households = population_affected / 4.5
    
    # Convert food to practical units (assuming 500kcal per meal pack)
    meal_packs = int(food_total_kcal / 500)
    
    # Water containers (20L jerrycans)
    water_containers = int(water_total / 20)
    
    result = {
        "disaster_summary": {
            "type": disaster_type,
            "severity": severity,
            "population_affected": population_affected,
            "households_affected": int(households),
            "duration_days": duration_days,
            "calculated_at": datetime.now().isoformat()
        },
        "water_supplies": {
            "total_liters": int(water_total),
            "jerrycans_20L": water_containers,
            "water_trucks_10000L": int(water_total / 10000) + 1,
            "priority": "CRITICAL" if disaster_type in ["flood", "drought", "tsunami"] else "HIGH"
        },
        "food_supplies": {
            "total_kcal_needed": int(food_total_kcal),
            "meal_packs_500kcal": meal_packs,
            "family_food_kits_7day": int(households * (duration_days / 7)),
            "priority": "CRITICAL"
        },
        "medical_supplies": {
            "basic_medical_kits": medical_kits,
            "trauma_kits": int(medical_kits * 0.2) if disaster_type in ["earthquake", "tsunami"] else int(medical_kits * 0.1),
            "cholera_kits": int(population_affected / 500) if disaster_type in ["flood", "tsunami"] else 0,
            "priority": "CRITICAL" if severity in ["critical", "catastrophic"] else "HIGH"
        },
        "shelter_supplies": {
            "emergency_shelter_units": shelter_units,
            "tarpaulins": int(households * 2),
            "blankets": int(population_affected * 2),
            "sleeping_mats": population_affected,
            "priority": "HIGH"
        },
        "specialized_equipment": {},
        "logistics_estimate": {
            "cargo_flights_needed": int((water_total + meal_packs * 0.5) / 50000) + 1,
            "truck_loads_needed": int((water_total + meal_packs * 0.5) / 20000) + 1,
            "estimated_cost_usd": int(population_affected * duration_days * 15 * multiplier)
        }
    }
    
    # Add disaster-specific equipment
    if disaster_type == "flood":
        result["specialized_equipment"] = {
            "water_purification_tablets": int(population_affected * ratios.get("water_purification_tablets_per_person", 100)),
            "rubber_boots_pairs": int(population_affected * 0.3),
            "sandbags": int(households * 50),
            "water_pumps": int(households / 100) + 1
        }
    elif disaster_type == "earthquake":
        result["specialized_equipment"] = {
            "search_rescue_teams": int((population_affected / 10000) * ratios.get("search_rescue_teams_per_10000", 5)),
            "heavy_lifting_equipment": int(shelter_units / 50) + 1,
            "structural_assessment_teams": int(households / 500) + 1
        }
    elif disaster_type == "wildfire":
        result["specialized_equipment"] = {
            "respirator_masks_n95": int(population_affected * ratios.get("respirator_masks_per_person", 5)),
            "eye_wash_stations": int(population_affected / 500) + 1,
            "air_quality_monitors": int(households / 1000) + 5
        }
    elif disaster_type == "tsunami":
        result["specialized_equipment"] = {
            "body_recovery_kits": int((population_affected / 1000) * ratios.get("body_bags_per_1000", 50)),
            "debris_clearing_equipment": int(households / 200) + 1,
            "temporary_morgue_units": int(population_affected / 5000) + 1
        }
    
    return json.dumps(result, indent=2)


@server.tool(
    name="prioritize_zones",
    description="Analyze a list of affected zones and sort them by risk/urgency based on population density, infrastructure damage, accessibility, and vulnerability factors."
)
async def prioritize_zones(
    zones_list: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Prioritize disaster zones for relief operations.
    
    Args:
        zones_list: List of zone dictionaries with fields:
            - name: Zone identifier
            - coordinates: [lat, lon]
            - population: Affected population
            - infrastructure_damage: 0-100 percentage
            - accessibility: 0-100 (100 = fully accessible)
            - vulnerable_population: Percentage of elderly/children/disabled
            - has_medical_facility: Boolean
            - water_access: Boolean
            
    Returns:
        Prioritized list with urgency scores and recommended actions
    """
    if not zones_list:
        return ToolResult(success=False, error="Empty zones list provided")
    
    prioritized = []
    
    for zone in zones_list:
        # Calculate urgency score (0-100, higher = more urgent)
        score = 0
        factors = []
        
        # Population factor (max 25 points)
        pop = zone.get("population", 0)
        pop_score = min(25, (pop / 10000) * 25)
        score += pop_score
        factors.append(f"Population impact: {pop_score:.1f}/25")
        
        # Infrastructure damage (max 25 points)
        damage = zone.get("infrastructure_damage", 50)
        damage_score = (damage / 100) * 25
        score += damage_score
        factors.append(f"Infrastructure damage: {damage_score:.1f}/25")
        
        # Accessibility penalty (max 20 points - less accessible = more urgent for planning)
        access = zone.get("accessibility", 50)
        access_score = ((100 - access) / 100) * 20
        score += access_score
        factors.append(f"Accessibility challenge: {access_score:.1f}/20")
        
        # Vulnerable population (max 15 points)
        vulnerable = zone.get("vulnerable_population", 20)
        vuln_score = (vulnerable / 100) * 15
        score += vuln_score
        factors.append(f"Vulnerable population: {vuln_score:.1f}/15")
        
        # Critical infrastructure (max 15 points)
        has_medical = zone.get("has_medical_facility", True)
        has_water = zone.get("water_access", True)
        infra_score = 0
        if not has_medical:
            infra_score += 8
        if not has_water:
            infra_score += 7
        score += infra_score
        factors.append(f"Critical infrastructure gaps: {infra_score:.1f}/15")
        
        # Determine priority tier
        if score >= 80:
            tier = "CRITICAL"
            action = "Immediate deployment required - Life-threatening conditions"
        elif score >= 60:
            tier = "HIGH"
            action = "Priority deployment within 24 hours"
        elif score >= 40:
            tier = "MODERATE"
            action = "Scheduled deployment within 48-72 hours"
        else:
            tier = "STANDARD"
            action = "Regular relief operations timeline"
        
        prioritized.append({
            "zone": zone.get("name", "Unknown"),
            "coordinates": zone.get("coordinates", [0, 0]),
            "urgency_score": round(score, 1),
            "priority_tier": tier,
            "recommended_action": action,
            "scoring_breakdown": factors,
            "estimated_resources": {
                "relief_teams_needed": max(1, int(pop / 2000)),
                "medical_teams_needed": max(1, int(pop / 5000)) + (2 if not has_medical else 0),
                "water_supply_priority": not has_water
            }
        })
    
    # Sort by urgency score (descending)
    prioritized.sort(key=lambda x: x["urgency_score"], reverse=True)
    
    # Add ranking
    for i, zone in enumerate(prioritized):
        zone["rank"] = i + 1
    
    result = {
        "analysis_timestamp": datetime.now().isoformat(),
        "total_zones_analyzed": len(prioritized),
        "critical_zones": len([z for z in prioritized if z["priority_tier"] == "CRITICAL"]),
        "high_priority_zones": len([z for z in prioritized if z["priority_tier"] == "HIGH"]),
        "prioritized_zones": prioritized,
        "deployment_recommendation": f"Deploy to {prioritized[0]['zone']} first (Score: {prioritized[0]['urgency_score']})"
    }
    
    return json.dumps(result, indent=2)


@server.tool(
    name="logistics_router",
    description="Calculate relief convoy travel time and route between coordinates, simulating real-world delays like road damage, checkpoints, and weather."
)
async def logistics_router(
    start_coord: List[float],
    end_coord: List[float],
    vehicle_type: str = "truck",
    cargo_weight_tons: float = 10.0,
    road_condition: str = "damaged",
    include_delays: bool = True
) -> Dict[str, Any]:
    """
    Calculate logistics route and travel time for relief convoys.
    
    Args:
        start_coord: Starting coordinates [latitude, longitude]
        end_coord: Destination coordinates [latitude, longitude]
        vehicle_type: Type of vehicle (truck, helicopter, boat, aircraft)
        cargo_weight_tons: Weight of cargo in metric tons
        road_condition: Road condition (normal, damaged, severely_damaged, impassable)
        include_delays: Whether to simulate real-world delays
        
    Returns:
        Route information with time estimates and potential issues
    """
    # Calculate straight-line distance using Haversine formula
    lat1, lon1 = math.radians(start_coord[0]), math.radians(start_coord[1])
    lat2, lon2 = math.radians(end_coord[0]), math.radians(end_coord[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth's radius in km
    r = 6371
    straight_distance = r * c
    
    # Vehicle parameters
    vehicle_params = {
        "truck": {"base_speed_kmh": 60, "fuel_consumption_l_per_100km": 35, "road_factor": 1.3},
        "helicopter": {"base_speed_kmh": 200, "fuel_consumption_l_per_100km": 150, "road_factor": 1.0},
        "boat": {"base_speed_kmh": 30, "fuel_consumption_l_per_100km": 50, "road_factor": 1.1},
        "aircraft": {"base_speed_kmh": 500, "fuel_consumption_l_per_100km": 300, "road_factor": 1.0}
    }
    
    params = vehicle_params.get(vehicle_type, vehicle_params["truck"])
    
    # Road condition multipliers (for ground vehicles)
    road_multipliers = {
        "normal": 1.0,
        "damaged": 1.5,
        "severely_damaged": 2.5,
        "impassable": float('inf')
    }
    
    road_mult = road_multipliers.get(road_condition, 1.5)
    
    # Calculate actual travel distance (roads aren't straight)
    actual_distance = straight_distance * params["road_factor"]
    
    # Adjust speed based on conditions
    if vehicle_type in ["truck", "boat"]:
        effective_speed = params["base_speed_kmh"] / road_mult
        # Weight penalty
        weight_penalty = 1 + (cargo_weight_tons / 50) * 0.1
        effective_speed /= weight_penalty
    else:
        effective_speed = params["base_speed_kmh"]
    
    # Base travel time
    if road_condition == "impassable" and vehicle_type == "truck":
        base_travel_hours = float('inf')
    else:
        base_travel_hours = actual_distance / effective_speed
    
    # Simulate delays
    delays = []
    total_delay_hours = 0
    
    if include_delays and vehicle_type == "truck":
        # Checkpoint delays (random 0-3 checkpoints)
        num_checkpoints = random.randint(0, 3)
        if num_checkpoints > 0:
            checkpoint_delay = num_checkpoints * random.uniform(0.25, 1.0)
            delays.append({
                "type": "Security Checkpoints",
                "count": num_checkpoints,
                "delay_hours": round(checkpoint_delay, 2)
            })
            total_delay_hours += checkpoint_delay
        
        # Road damage detours
        if road_condition in ["damaged", "severely_damaged"]:
            detour_delay = random.uniform(0.5, 2.0) if road_condition == "damaged" else random.uniform(1.5, 4.0)
            delays.append({
                "type": "Road Damage Detour",
                "severity": road_condition,
                "delay_hours": round(detour_delay, 2)
            })
            total_delay_hours += detour_delay
        
        # Weather delay (20% chance)
        if random.random() < 0.2:
            weather_delay = random.uniform(0.5, 3.0)
            delays.append({
                "type": "Weather Conditions",
                "description": random.choice(["Heavy rain", "Poor visibility", "Flooding", "Strong winds"]),
                "delay_hours": round(weather_delay, 2)
            })
            total_delay_hours += weather_delay
        
        # Rest stops for long journeys
        if base_travel_hours > 8:
            rest_stops = int(base_travel_hours / 8)
            rest_delay = rest_stops * 0.5
            delays.append({
                "type": "Mandatory Rest Stops",
                "count": rest_stops,
                "delay_hours": round(rest_delay, 2)
            })
            total_delay_hours += rest_delay
    
    total_travel_hours = base_travel_hours + total_delay_hours
    
    # Calculate fuel needs
    fuel_needed = (actual_distance / 100) * params["fuel_consumption_l_per_100km"]
    
    # Estimated arrival
    departure_time = datetime.now()
    if total_travel_hours != float('inf'):
        arrival_time = departure_time + timedelta(hours=total_travel_hours)
        arrival_str = arrival_time.isoformat()
    else:
        arrival_str = "ROUTE IMPASSABLE"
    
    result = {
        "route_summary": {
            "start_coordinates": start_coord,
            "end_coordinates": end_coord,
            "straight_line_distance_km": round(straight_distance, 2),
            "actual_route_distance_km": round(actual_distance, 2),
            "vehicle_type": vehicle_type,
            "cargo_weight_tons": cargo_weight_tons
        },
        "time_estimates": {
            "base_travel_hours": round(base_travel_hours, 2) if base_travel_hours != float('inf') else "N/A",
            "total_delay_hours": round(total_delay_hours, 2),
            "total_travel_hours": round(total_travel_hours, 2) if total_travel_hours != float('inf') else "N/A",
            "departure_time": departure_time.isoformat(),
            "estimated_arrival": arrival_str
        },
        "conditions": {
            "road_condition": road_condition,
            "effective_speed_kmh": round(effective_speed, 1),
            "delays": delays
        },
        "logistics": {
            "fuel_needed_liters": round(fuel_needed, 1),
            "fuel_cost_estimate_usd": round(fuel_needed * 1.5, 2),
            "recommended_fuel_reserve_percent": 20
        },
        "recommendations": []
    }
    
    # Add recommendations
    if road_condition == "impassable":
        result["recommendations"].append("Consider helicopter or aircraft transport")
    if total_travel_hours > 12:
        result["recommendations"].append("Plan for driver rotation or overnight stops")
    if cargo_weight_tons > 20:
        result["recommendations"].append("Consider splitting cargo across multiple vehicles")
    if len(delays) > 2:
        result["recommendations"].append("High delay risk - consider alternative routes or timing")
    
    return json.dumps(result, indent=2)


@server.tool(
    name="generate_crisis_report",
    description="Generate a comprehensive markdown Crisis Action Report summarizing the disaster situation, resource needs, and recommended actions."
)
async def generate_crisis_report(
    disaster_type: str,
    location: str,
    population_affected: int,
    severity: str,
    weather_data: Optional[Dict[str, Any]] = None,
    zones_data: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Generate a comprehensive Crisis Action Report in markdown format.
    
    Args:
        disaster_type: Type of disaster
        location: Affected location name
        population_affected: Number of people affected
        severity: Severity level
        weather_data: Optional weather information
        zones_data: Optional zone prioritization data
        
    Returns:
        Markdown-formatted Crisis Action Report
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M UTC")
    
    # Calculate supplies
    supply_result = await calculate_supply_needs(
        disaster_type=disaster_type,
        population_affected=population_affected,
        severity=severity
    )
    supplies = json.loads(supply_result)
    
    report = f"""# 🚨 CRISIS ACTION REPORT
## Aegis-1 Disaster Response System

**Report Generated:** {timestamp}  
**Classification:** OPERATIONAL  
**Report ID:** AEGIS-{datetime.now().strftime('%Y%m%d%H%M')}

---

## 📍 SITUATION OVERVIEW

| Parameter | Value |
|-----------|-------|
| **Disaster Type** | {disaster_type.upper()} |
| **Location** | {location} |
| **Severity Level** | {severity.upper()} |
| **Population Affected** | {population_affected:,} |
| **Households Affected** | ~{int(population_affected/4.5):,} |

---

## 💧 CRITICAL RESOURCE REQUIREMENTS

### Water Supplies
- **Total Required:** {supplies['water_supplies']['total_liters']:,} liters
- **20L Jerrycans:** {supplies['water_supplies']['jerrycans_20L']:,}
- **Water Trucks (10,000L):** {supplies['water_supplies']['water_trucks_10000L']}
- **Priority:** {supplies['water_supplies']['priority']}

### Food Supplies  
- **Meal Packs (500kcal):** {supplies['food_supplies']['meal_packs_500kcal']:,}
- **Family Food Kits (7-day):** {supplies['food_supplies']['family_food_kits_7day']:,}
- **Priority:** {supplies['food_supplies']['priority']}

### Medical Supplies
- **Basic Medical Kits:** {supplies['medical_supplies']['basic_medical_kits']:,}
- **Trauma Kits:** {supplies['medical_supplies']['trauma_kits']:,}
- **Priority:** {supplies['medical_supplies']['priority']}

### Shelter Supplies
- **Emergency Shelters:** {supplies['shelter_supplies']['emergency_shelter_units']:,}
- **Tarpaulins:** {supplies['shelter_supplies']['tarpaulins']:,}
- **Blankets:** {supplies['shelter_supplies']['blankets']:,}

---

## 🚚 LOGISTICS ESTIMATE

| Resource | Quantity |
|----------|----------|
| Cargo Flights | {supplies['logistics_estimate']['cargo_flights_needed']} |
| Truck Loads | {supplies['logistics_estimate']['truck_loads_needed']} |
| **Estimated Cost** | **${supplies['logistics_estimate']['estimated_cost_usd']:,} USD** |

---

"""
    
    # Add weather section if available
    if weather_data:
        report += f"""## 🌤️ WEATHER CONDITIONS

| Metric | Value |
|--------|-------|
| Temperature | {weather_data.get('temperature', 'N/A')}°C |
| Conditions | {weather_data.get('conditions', 'N/A')} |
| Wind Speed | {weather_data.get('wind_speed', 'N/A')} km/h |
| Precipitation | {weather_data.get('precipitation', 'N/A')} mm |

**Weather Impact:** {weather_data.get('impact_assessment', 'Assessment pending')}

---

"""
    
    # Add zone priorities if available
    if zones_data:
        report += """## 🎯 ZONE PRIORITIZATION

| Rank | Zone | Urgency Score | Priority |
|------|------|---------------|----------|
"""
        for zone in zones_data[:5]:  # Top 5 zones
            report += f"| {zone.get('rank', '-')} | {zone.get('zone', 'Unknown')} | {zone.get('urgency_score', 0)} | {zone.get('priority_tier', 'N/A')} |\n"
        
        report += "\n---\n\n"
    
    report += f"""## ⚡ IMMEDIATE ACTIONS REQUIRED

1. **Deploy Water Supplies** - Priority distribution to areas without water access
2. **Establish Medical Stations** - Set up {max(3, int(population_affected/10000))} field hospitals
3. **Shelter Distribution** - Begin emergency shelter deployment
4. **Search & Rescue** - Coordinate with local emergency services
5. **Communications** - Establish emergency broadcast channels

---

## 📞 COORDINATION CONTACTS

| Role | Status |
|------|--------|
| Field Commander | ASSIGNED |
| Logistics Lead | ASSIGNED |
| Medical Coordinator | ASSIGNED |
| Communications | ACTIVE |

---

*This report was automatically generated by the Aegis-1 Crisis Response System.*  
*For updates, query the system with: "Status update for {location}"*
"""
    
    return report


# Run the server
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 60)
    print("🚨 Relief Operations MCP Server")
    print("=" * 60)
    print(f"Server: {server.name} v{server.version}")
    print(f"Endpoint: http://{MCP_HOST}:{MCP_PORT}/mcp")
    print("")
    print("Available Tools:")
    print("  • calculate_supply_needs")
    print("  • prioritize_zones")
    print("  • logistics_router")
    print("  • generate_crisis_report")
    print("=" * 60)
    
    server.run(host=MCP_HOST, port=MCP_PORT)

