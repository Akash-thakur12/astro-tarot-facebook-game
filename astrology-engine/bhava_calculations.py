import swisseph as swe
from constants import PLANET_ASPECT_RULES, MANGLIK_HOUSES, MANGLIK_REFERENCES
from calculations import get_rashi_name

def calculate_bhava_chart(jd_ut: float, latitude: float, longitude: float) -> tuple[dict[str, str], list[float]]:
    """
    Calculates the 12 sidereal house cusps (Equal House system) using Swiss Ephemeris.
    
    Returns:
        tuple[dict[str, str], list[float]]: 
            - A dictionary mapping "house1"..."house12" to Rashi Names.
            - A list of raw cusp degrees (0-360) for house placement checking.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    # cusps: tuple of 12 floats representing house cusps (1-indexed conceptually, 0-indexed in Python tuple)
    # ascmc: tuple of 8 floats for Asc/MC points
    cusps, _ = swe.houses_ex(jd_ut, latitude, longitude, b'E', swe.FLG_SIDEREAL)
    
    bhava_chart = {}
    for i in range(12):
        bhava_chart[f"house{i + 1}"] = get_rashi_name(cusps[i])
        
    return bhava_chart, list(cusps)

def determine_planet_house(longitude: float, cusps: list[float]) -> int:
    """
    Determines which house (1-12) contains the given planet longitude based on house cusps.
    """
    for i in range(12):
        cusp_current = cusps[i]
        cusp_next = cusps[(i + 1) % 12]
        
        # Handle sign/zodiac boundary crossing (e.g. from 355 degrees to 25 degrees)
        if cusp_current <= cusp_next:
            if cusp_current <= longitude < cusp_next:
                return i + 1
        else:
            if longitude >= cusp_current or longitude < cusp_next:
                return i + 1
    return 1  # Fallback

def calculate_planet_placements(positions: dict[str, float], cusps: list[float]) -> dict[str, int]:
    """
    Places each of the 9 planets into one of the 12 houses.
    
    Returns:
        dict[str, int]: Mapping from planetary keys to house numbers (1-12) (e.g. {"sunHouse": 10})
    """
    placements = {}
    for planet_name, planet_lon in positions.items():
        house_num = determine_planet_house(planet_lon, cusps)
        placements[f"{planet_name}House"] = house_num
    return placements

def calculate_drishti_aspects(planet_placements: dict[str, int]) -> dict[str, list[int]]:
    """
    Calculates the houses aspected by each planet in the chart using relative Vedic aspect rules.
    
    Returns:
        dict[str, list[int]]: Mapping from planetary keys to list of absolute house numbers aspected.
    """
    drishti = {}
    for planet, aspect_rules in PLANET_ASPECT_RULES.items():
        # Get the house where the planet is placed (e.g. marsHouse -> house number)
        planet_house = planet_placements.get(f"{planet}House")
        if planet_house is None:
            continue
            
        aspected_houses = []
        for rule in aspect_rules:
            # Vedic aspect: e.g. 7th aspect from house H is (H + 7 - 1) % 12 (1-indexed math)
            aspected = (planet_house + rule - 2) % 12 + 1
            aspected_houses.append(aspected)
            
        drishti[f"{planet}Aspects"] = sorted(aspected_houses)
        
    return drishti

def detect_manglik_dosha(planet_placements: dict[str, int]) -> dict:
    """
    Detects Manglik Dosha based on Mars house placement relative to Lagna, Moon, and Venus.
    """
    mars_house = planet_placements.get("marsHouse", 1)
    moon_house = planet_placements.get("moonHouse", 1)
    venus_house = planet_placements.get("venusHouse", 1)
    
    reasons = []
    
    # Lagna is by definition House 1, so the relative position from Lagna is just Mars's absolute house
    if "lagna" in MANGLIK_REFERENCES:
        if mars_house in MANGLIK_HOUSES:
            reasons.append(f"Mars is in House {mars_house} from Lagna")
            
    # Relative position from Moon: (Mars House - Moon House) % 12 + 1
    if "moon" in MANGLIK_REFERENCES:
        relative_to_moon = (mars_house - moon_house) % 12 + 1
        if relative_to_moon in MANGLIK_HOUSES:
            reasons.append(f"Mars is in House {relative_to_moon} from Moon (House {moon_house})")
            
    # Relative position from Venus: (Mars House - Venus House) % 12 + 1
    if "venus" in MANGLIK_REFERENCES:
        relative_to_venus = (mars_house - venus_house) % 12 + 1
        if relative_to_venus in MANGLIK_HOUSES:
            reasons.append(f"Mars is in House {relative_to_venus} from Venus (House {venus_house})")
            
    score = len(reasons)
    is_manglik = score > 0
    
    # Severity assessment
    if score == 0:
        severity = "none"
    elif score == 1:
        severity = "low"
    elif score == 2:
        severity = "medium"
    else:
        severity = "high"
        
    return {
        "isManglik": is_manglik,
        "severity": severity,
        "reasons": reasons
    }
