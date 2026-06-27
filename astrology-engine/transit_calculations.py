from datetime import datetime
import swisseph as swe
from constants import RASHI_NAMES
from calculations import calculate_planetary_positions, get_rashi_name

def calculate_transits(
    lagna_rashi: str,
    natal_moon_rashi: str,
    target_dt: datetime
) -> dict:
    """
    Calculates sidereal transit planetary positions, transit house placements relative to Lagna,
    and detects Sade Sati / Dhaiya transits for Saturn.
    
    Args:
        lagna_rashi (str): Natal Lagna Rashi name (e.g. "Pisces")
        natal_moon_rashi (str): Natal Moon Rashi name (e.g. "Aquarius")
        target_dt (datetime): UTC datetime for transit calculation
        
    Returns:
        dict: Transit placements, Sade Sati status, and Dhaiya status.
    """
    # 1. Compute Julian Day for target_dt (UTC)
    decimal_hour = target_dt.hour + target_dt.minute / 60.0 + target_dt.second / 3600.0
    jd_ut = swe.julday(target_dt.year, target_dt.month, target_dt.day, decimal_hour, swe.GREG_CAL)
    
    # 2. Get sidereal positions of transiting planets
    transit_positions = calculate_planetary_positions(jd_ut)
    
    # 3. Find sign indices for Lagna and natal Moon
    lagna_idx = RASHI_NAMES.index(lagna_rashi)
    moon_idx = RASHI_NAMES.index(natal_moon_rashi)
    
    # 4. Map transit planets to relative house placements from natal Lagna
    transit_placements = {}
    transit_rashis = {}
    
    for planet_name, planet_lon in transit_positions.items():
        # Get Rashi sign index for transiting planet
        planet_rashi_idx = int((planet_lon % 360) // 30)
        transit_rashis[planet_name] = RASHI_NAMES[planet_rashi_idx]
        
        # Calculate relative house: (Planet Rashi - Lagna Rashi) % 12 + 1
        rel_house = (planet_rashi_idx - lagna_idx) % 12 + 1
        transit_placements[f"{planet_name}TransitHouse"] = rel_house
        
    # 5. Detect Sade Sati & Dhaiya relative to natal Moon
    saturn_transit_rashi = transit_rashis["saturn"]
    saturn_rashi_idx = RASHI_NAMES.index(saturn_transit_rashi)
    
    # Relative house of transiting Saturn from natal Moon
    saturn_rel_house_from_moon = (saturn_rashi_idx - moon_idx) % 12 + 1
    
    # Sade Sati: Saturn is in 12th, 1st, or 2nd house from Moon
    is_sade_sati = False
    sade_sati_phase = "None"
    
    if saturn_rel_house_from_moon == 12:
        is_sade_sati = True
        sade_sati_phase = "First"
    elif saturn_rel_house_from_moon == 1:
        is_sade_sati = True
        sade_sati_phase = "Second"
    elif saturn_rel_house_from_moon == 2:
        is_sade_sati = True
        sade_sati_phase = "Third"
        
    # Dhaiya: Saturn is in 4th or 8th house from Moon
    is_dhaiya = False
    dhaiya_type = "None"
    
    if saturn_rel_house_from_moon == 4:
        is_dhaiya = True
        dhaiya_type = "Kantak Shani"
    elif saturn_rel_house_from_moon == 8:
        is_dhaiya = True
        dhaiya_type = "Ashtam Shani"
        
    return {
        # Transit positions (longitudes)
        "transitPositions": {f"transit_{k}": v for k, v in transit_positions.items()},
        # Transit houses
        "transitHouses": transit_placements,
        # Sade Sati Status
        "isSadeSati": is_sade_sati,
        "phase": sade_sati_phase,
        # Dhaiya Status
        "isDhaiya": is_dhaiya,
        "type": dhaiya_type
    }
