from datetime import datetime, timedelta
import swisseph as swe
from constants import RASHI_NAMES, DASHA_CYCLE, DASHA_PERIODS, DAYS_PER_YEAR
from calculations import get_rashi_name, calculate_planetary_positions
from yog_calculations import SIGN_LORDS, EXALTED_PLANETS

def get_dasha_at_time(
    moon_longitude: float,
    birth_datetime_utc: datetime,
    target_dt: datetime
) -> tuple[str, str]:
    """
    Finds the active (mahadasha_lord, antardasha_lord) at target_dt.
    """
    # 1. Moon's Nakshatra
    nakshatra_width = 360.0 / 27.0
    moon_lon_normalized = moon_longitude % 360.0
    nakshatra_idx = int(moon_lon_normalized // nakshatra_width)
    
    # 2. Starting Lord and cycle index
    start_lord_idx = nakshatra_idx % 9
    starting_lord = DASHA_CYCLE[start_lord_idx]
    
    # 3. Remaining fraction
    degree_in_nakshatra = moon_lon_normalized % nakshatra_width
    fraction_elapsed = degree_in_nakshatra / nakshatra_width
    start_lord_period = DASHA_PERIODS[starting_lord]
    elapsed_years = fraction_elapsed * start_lord_period
    remaining_years = start_lord_period - elapsed_years
    
    # 4. Conceptual start
    dt_conceptual_start = birth_datetime_utc - timedelta(days=elapsed_years * DAYS_PER_YEAR)
    
    # 5. Find active Mahadasha
    current_md_start = dt_conceptual_start
    active_md_lord = None
    active_md_start = None
    active_md_end = None
    active_md_total_years = None
    
    total_dashas = len(DASHA_CYCLE) * 3
    for i in range(total_dashas):
        md_lord = DASHA_CYCLE[(start_lord_idx + i) % 9]
        md_total_years = DASHA_PERIODS[md_lord]
        md_duration_days = md_total_years * DAYS_PER_YEAR
        current_md_end = current_md_start + timedelta(days=md_duration_days)
        
        if current_md_start <= target_dt < current_md_end:
            active_md_lord = md_lord
            active_md_start = current_md_start
            active_md_end = current_md_end
            active_md_total_years = md_total_years
            break
        current_md_start = current_md_end
        
    if not active_md_lord:
        return "Unknown", "Unknown"
        
    # 6. Find active Antardasha
    md_lord_cycle_idx = DASHA_CYCLE.index(active_md_lord)
    current_ad_start = active_md_start
    
    for j in range(9):
        ad_lord = DASHA_CYCLE[(md_lord_cycle_idx + j) % 9]
        ad_lord_period = DASHA_PERIODS[ad_lord]
        ad_total_years = active_md_total_years * (ad_lord_period / 120.0)
        ad_duration_days = ad_total_years * DAYS_PER_YEAR
        current_ad_end = current_ad_start + timedelta(days=ad_duration_days)
        
        if current_ad_start <= target_dt < current_ad_end:
            return active_md_lord, ad_lord
        current_ad_start = current_ad_end
        
    return active_md_lord, "Unknown"

def calculate_marriage_promise(
    positions: dict[str, float],
    placements: dict[str, int],
    bhava_chart: dict[str, str],
    navamsa: dict[str, str],
    manglik: dict
) -> tuple[int, str, dict]:
    """
    Evaluates the Marriage Promise Score (0-100) and Potential ("High", "Medium", "Low").
    """
    explanation = {}
    
    # 1. 7th House Strength (max 20 points)
    # Benefics: Moon, Mercury, Venus, Jupiter. Malefics: Sun, Saturn, Rahu, Ketu, Mars.
    benefics = ["moon", "mercury", "venus", "jupiter"]
    malefics = ["sun", "saturn", "rahu", "ketu", "mars"]
    h7_score = 15
    for p in benefics:
        if placements.get(f"{p}House") == 7:
            h7_score += 5
    for p in malefics:
        if placements.get(f"{p}House") == 7:
            h7_score -= 5
    h7_score = max(0, min(20, h7_score))
    explanation["7thHouseStrength"] = f"{h7_score}/20 (placement of planets in the 7th house)"
    
    # 2. 7th Lord Strength (max 20 points)
    lord_7 = SIGN_LORDS[bhava_chart["house7"]]
    lord_7_house = placements.get(f"{lord_7}House", 1)
    lord_7_rashi = RASHI_NAMES[int((positions[lord_7] % 360) // 30)]
    
    lord7_score = 12
    if lord_7_house in [1, 4, 7, 10, 5, 9]:
        lord7_score += 4
    elif lord_7_house in [6, 8, 12]:
        lord7_score -= 4
        
    deb_dict = {
        "sun": "Libra", "moon": "Scorpio", "mars": "Cancer", "mercury": "Pisces",
        "jupiter": "Capricorn", "venus": "Virgo", "saturn": "Aries"
    }
    if EXALTED_PLANETS.get(lord_7) == lord_7_rashi:
        lord7_score += 4
    elif deb_dict.get(lord_7) == lord_7_rashi:
        lord7_score -= 4
    lord7_score = max(0, min(20, lord7_score))
    explanation["7thLordStrength"] = f"{lord7_score}/20 (lord of 7th house: {lord_7.capitalize()} in House {lord_7_house})"
    
    # 3. Venus Strength (max 20 points)
    venus_house = placements.get("venusHouse", 1)
    venus_rashi = RASHI_NAMES[int((positions["venus"] % 360) // 30)]
    venus_score = 12
    if venus_house in [1, 4, 7, 10, 5, 9]:
        venus_score += 4
    elif venus_house in [6, 8, 12]:
        venus_score -= 4
        
    if EXALTED_PLANETS.get("venus") == venus_rashi or venus_rashi in ["Taurus", "Libra"]:
        venus_score += 4
    elif venus_rashi == "Virgo":
        venus_score -= 4
    venus_score = max(0, min(20, venus_score))
    explanation["venusStrength"] = f"{venus_score}/20 (Venus placement and sign strength)"
    
    # 4. Jupiter Strength (max 15 points)
    jup_house = placements.get("jupiterHouse", 1)
    jup_rashi = RASHI_NAMES[int((positions["jupiter"] % 360) // 30)]
    jup_score = 9
    if jup_house in [1, 4, 7, 10, 5, 9]:
        jup_score += 3
    elif jup_house in [6, 8, 12]:
        jup_score -= 3
        
    if EXALTED_PLANETS.get("jupiter") == jup_rashi or jup_rashi in ["Sagittarius", "Pisces"]:
        jup_score += 3
    elif jup_rashi == "Capricorn":
        jup_score -= 3
    jup_score = max(0, min(15, jup_score))
    explanation["jupiterStrength"] = f"{jup_score}/15 (Jupiter placement and sign strength)"
    
    # 5. D9 (Navamsa) Strength (max 15 points)
    lagna_lord = SIGN_LORDS[bhava_chart["house1"]]
    d9_score = 9
    
    venus_d9 = navamsa.get("venusNavamsa")
    lord_7_d9 = navamsa.get(f"{lord_7}Navamsa")
    lagna_lord_d9 = navamsa.get(f"{lagna_lord}Navamsa")
    
    if venus_d9 in ["Pisces", "Taurus", "Libra"]:
        d9_score += 3
    if lord_7_d9 in [EXALTED_PLANETS.get(lord_7), "Taurus", "Libra", "Sagittarius", "Pisces", "Aries", "Scorpio", "Cancer", "Leo"]:
        d9_score += 3
    d9_score = max(0, min(15, d9_score))
    explanation["navamsaD9Strength"] = f"{d9_score}/15 (exaltation/own sign status in D9 chart)"
    
    # 6. Manglik Impact (max 10 points)
    manglik_score = 10
    if manglik.get("isManglik"):
        sev = manglik.get("severity", "low")
        if sev == "low":
            manglik_score -= 3
        elif sev == "medium":
            manglik_score -= 6
        elif sev == "high":
            manglik_score -= 10
    explanation["manglikImpact"] = f"{manglik_score}/10 (dosha severity adjustment)"
    
    promise_score = h7_score + lord7_score + venus_score + jup_score + d9_score + manglik_score
    
    if promise_score >= 75:
        potential = "High"
    elif promise_score >= 50:
        potential = "Medium"
    else:
        potential = "Low"
        
    return promise_score, potential, explanation

def calculate_marriage_timing_windows(
    moon_longitude: float,
    birth_datetime_utc: datetime,
    lagna_rashi: str,
    natal_moon_rashi: str,
    bhava_chart: dict[str, str],
    placements: dict[str, int],
    current_time_utc: datetime
) -> list[dict]:
    """
    Scans the next 10 years (monthly intervals) for supportive marriage timing windows.
    
    Triggers evaluated:
    - Supportive Dashas (Venus, 7th Lord, Jupiter, Lagna Lord, or planet in 7th)
    - Supportive Jupiter Transits (transiting/aspecting 7th house, natal Venus, or in Kendra/Trikona)
    """
    lagna_idx = RASHI_NAMES.index(lagna_rashi)
    lord_7 = SIGN_LORDS[bhava_chart["house7"]]
    lord_1 = SIGN_LORDS[bhava_chart["house1"]]
    venus_house = placements.get("venusHouse", 1)
    
    # Identify planets in the 7th house
    planets_in_7 = []
    for p in ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]:
        if placements.get(f"{p}House") == 7:
            planets_in_7.append(p)
            
    supportive_months = []
    
    # Scan monthly intervals for 10 years (120 months)
    start_dt = current_time_utc
    for m in range(120):
        target_dt = start_dt + timedelta(days=m * 30.4375)  # Average days in month
        
        # A. Calculate Dasha Support
        md_lord, ad_lord = get_dasha_at_time(moon_longitude, birth_datetime_utc, target_dt)
        
        dasha_score = 0.0
        # Mahadasha lord support
        if md_lord in ["venus", lord_7]:
            dasha_score += 2.0
        elif md_lord in ["jupiter", lord_1] or md_lord in planets_in_7:
            dasha_score += 1.0
            
        # Antardasha lord support
        if ad_lord in ["venus", lord_7]:
            dasha_score += 2.0
        elif ad_lord in ["jupiter", lord_1] or ad_lord in planets_in_7:
            dasha_score += 1.0
            
        # B. Calculate Transit Jupiter Support
        decimal_hour = target_dt.hour + target_dt.minute / 60.0 + target_dt.second / 3600.0
        jd_ut = swe.julday(target_dt.year, target_dt.month, target_dt.day, decimal_hour, swe.GREG_CAL)
        
        # Calculate Jupiter longitude
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        res, _ = swe.calc_ut(jd_ut, swe.JUPITER, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        jup_lon = res[0]
        jup_rashi_idx = int((jup_lon % 360) // 30)
        
        # House of transiting Jupiter relative to natal Lagna
        jup_rel_house = (jup_rashi_idx - lagna_idx) % 12 + 1
        
        transit_score = 0.0
        # 1. Aspects or occupies the 7th house (placed in 1, 3, 7, or 11)
        # (1st aspect/occupies 7: 1+7-1 = 7 | 5th aspect from 3: 3+5-1 = 7 | 9th aspect from 11: 11+9-1 = 19 -> 7)
        if jup_rel_house in [1, 3, 7, 11]:
            transit_score += 3.0
            
        # 2. Aspects or occupies the house containing natal Venus
        rel_house_from_venus = (venus_house - jup_rel_house) % 12 + 1
        if rel_house_from_venus in [1, 5, 7, 9]:
            transit_score += 2.0
            
        # 3. Positioned in Kendra or Trikona from Lagna
        if jup_rel_house in [1, 4, 7, 10, 5, 9]:
            transit_score += 1.0
            
        combined_score = dasha_score + transit_score
        
        # If both Dasha and Transit are highly supportive (e.g. combined score >= 4.0)
        if combined_score >= 4.0:
            supportive_months.append({
                "date": target_dt,
                "md": md_lord,
                "ad": ad_lord,
                "jupHouse": jup_rel_house,
                "score": combined_score
            })
            
    # Merge consecutive months into timing windows
    windows = []
    if not supportive_months:
        return windows
        
    start_win = None
    prev_win = None
    
    for month_data in supportive_months:
        if start_win is None:
            start_win = month_data
            prev_win = month_data
        else:
            # Check if this month is consecutive (within 45 days of previous)
            if (month_data["date"] - prev_win["date"]).days <= 45:
                prev_win = month_data
            else:
                # Close current window and start new one
                windows.append({
                    "start": start_win["date"].strftime("%Y-%m"),
                    "end": prev_win["date"].strftime("%Y-%m"),
                    "details": f"Supportive transit Jupiter in House {start_win['jupHouse']} aspecting/occupying 7th house/Venus during {start_win['md'].capitalize()}-{start_win['ad'].capitalize()} dasha."
                })
                start_win = month_data
                prev_win = month_data
                
    if start_win is not None:
        windows.append({
            "start": start_win["date"].strftime("%Y-%m"),
            "end": prev_win["date"].strftime("%Y-%m"),
            "details": f"Supportive transit Jupiter in House {start_win['jupHouse']} aspecting/occupying 7th house/Venus during {start_win['md'].capitalize()}-{start_win['ad'].capitalize()} dasha."
        })
        
    return windows
