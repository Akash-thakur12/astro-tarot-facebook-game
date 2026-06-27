from datetime import datetime, timedelta, timezone
import swisseph as swe
from constants import (
    RASHI_NAMES,
    NAKSHATRAS,
    DASHA_CYCLE,
    DASHA_PERIODS,
    DAYS_PER_YEAR,
)

def calculate_julian_day(date_str: str, time_str: str, timezone_offset: float) -> tuple[float, datetime]:
    """
    Parses local birth details, converts them to UTC, and computes the Julian Day.
    
    Args:
        date_str (str): Date in format YYYY-MM-DD
        time_str (str): Time in format HH:MM:SS
        timezone_offset (float): Timezone offset in hours (e.g. +5.5 for IST)
        
    Returns:
        tuple[float, datetime]: Julian Day in UT, and birth datetime in UTC.
    """
    # 1. Parse local birth date and time.
    try:
        dt_local = datetime.strptime(f"{date_str.strip()} {time_str.strip()}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        # Fallback to hours and minutes if seconds are omitted.
        dt_local = datetime.strptime(f"{date_str.strip()} {time_str.strip()}", "%Y-%m-%d %H:%M")
        
    # 2. Subtract the timezone offset to convert local time to UTC.
    # If the user is at UTC+5.5, UTC time is local time - 5.5 hours.
    tz_offset = timedelta(hours=timezone_offset)
    dt_utc = dt_local - tz_offset
    # Attach UTC timezone info
    dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    
    # 3. Compute decimal hour in UTC.
    decimal_hour_utc = dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0
    
    # 4. Use Swiss Ephemeris to calculate Julian Day.
    # swe.GREG_CAL is used for Gregorian calendar dates.
    jd_ut = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, decimal_hour_utc, swe.GREG_CAL)
    
    return jd_ut, dt_utc

def get_rashi_name(longitude: float) -> str:
    """
    Finds the Rashi (zodiac sign) name for a given sidereal longitude.
    """
    index = int((longitude % 360) // 30)
    return RASHI_NAMES[index]

def get_nakshatra_details(moon_longitude: float) -> tuple[str, int, int]:
    """
    Finds the Nakshatra name, index, and Pada for a given Moon longitude.
    
    Returns:
        tuple[str, int, int]: Nakshatra name, Nakshatra index (0-26), and Pada (1-4).
    """
    # Nakshatra width is 360 / 27 = 13.333333333333334 degrees (13°20')
    nakshatra_width = 360.0 / 27.0
    moon_lon_normalized = moon_longitude % 360.0
    
    nakshatra_idx = int(moon_lon_normalized // nakshatra_width)
    nakshatra_name = NAKSHATRAS[nakshatra_idx]
    
    # Each Nakshatra has 4 Padas of 3.3333333333333335 degrees (3°20') each.
    pada_width = nakshatra_width / 4.0
    degree_in_nakshatra = moon_lon_normalized % nakshatra_width
    pada = int(degree_in_nakshatra // pada_width) + 1
    
    return nakshatra_name, nakshatra_idx, pada

def calculate_planetary_positions(jd_ut: float) -> dict[str, float]:
    """
    Calculates the sidereal positions (longitude in degrees) for the 9 planets.
    """
    # Set the sidereal calculation mode to Lahiri (Chitra Paksha Ayanamsha)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    # Define mapping of planet keys to Swiss Ephemeris body IDs.
    # Note: Ketu (South Node) is not a physical body in Swiss Ephemeris and is
    # calculated as exactly 180 degrees opposite to Rahu (True North Node).
    bodies = {
        "sun": swe.SUN,
        "moon": swe.MOON,
        "mars": swe.MARS,
        "mercury": swe.MERCURY,
        "jupiter": swe.JUPITER,
        "venus": swe.VENUS,
        "saturn": swe.SATURN,
        "rahu": swe.TRUE_NODE,
    }
    
    positions = {}
    # Use Swiss Ephemeris with the Sidereal flag
    flags = swe.FLG_SIDEREAL | swe.FLG_SWIEPH
    
    for name, body_id in bodies.items():
        res, _ = swe.calc_ut(jd_ut, body_id, flags)
        # res[0] is the longitude in degrees (0 to 360)
        positions[name] = res[0]
        
    positions["ketu"] = (positions["rahu"] + 180.0) % 360.0
    
    return positions

def calculate_lagna(jd_ut: float, latitude: float, longitude: float) -> float:
    """
    Calculates the sidereal Ascendant (Lagna) in degrees.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    # houses_ex calculates the house cusps and additional points (like Asc/MC).
    # lat: latitude (positive North), lon: longitude (positive East)
    # b'E': Equal house system (Ascendant is independent of house division systems,
    # and using 'E' prevents crashes in extreme/polar latitudes where Placidus fails).
    _, ascmc = swe.houses_ex(jd_ut, latitude, longitude, b'E', swe.FLG_SIDEREAL)
    return ascmc[0]

def calculate_vimshottari_dasha(
    moon_longitude: float, 
    birth_datetime_utc: datetime, 
    target_datetime_utc: datetime
) -> dict:
    """
    Calculates the active Vimshottari Mahadasha and Antardasha for a given target date.
    
    Vimshottari Dasha is a 120-year cycle based on the Moon's longitude at birth.
    The cycle order: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury.
    """
    # 1. Get the Moon's Nakshatra details
    _, nakshatra_idx, _ = get_nakshatra_details(moon_longitude)
    
    # 2. Determine the starting Dasha Lord and cycle index.
    # The 27 Nakshatras map sequentially to the 9 planets.
    start_lord_idx = nakshatra_idx % 9
    starting_lord = DASHA_CYCLE[start_lord_idx]
    
    # 3. Calculate the elapsed and remaining fraction of the starting Dasha.
    nakshatra_width = 360.0 / 27.0
    moon_lon_normalized = moon_longitude % 360.0
    degree_in_nakshatra = moon_lon_normalized % nakshatra_width
    fraction_elapsed = degree_in_nakshatra / nakshatra_width
    
    # Get total period duration of starting lord
    start_lord_period = DASHA_PERIODS[starting_lord]
    elapsed_years = fraction_elapsed * start_lord_period
    remaining_years = start_lord_period - elapsed_years
    
    # 4. Compute the conceptual start date of the first Mahadasha.
    # We trace back elapsed_years from the birth date.
    dt_conceptual_start = birth_datetime_utc - timedelta(days=elapsed_years * DAYS_PER_YEAR)
    
    # 5. Build the Mahadasha timeline and find the one active at target_datetime_utc.
    current_md_start = dt_conceptual_start
    # We iterate multiple cycles to ensure we cover up to 300+ years.
    total_dashas = len(DASHA_CYCLE) * 3  # 27 dashas, covers ~360 years
    
    active_mahadasha = None
    active_md_lord = None
    active_md_start = None
    active_md_end = None
    active_md_total_years = None
    
    for i in range(total_dashas):
        md_lord = DASHA_CYCLE[(start_lord_idx + i) % 9]
        md_total_years = DASHA_PERIODS[md_lord]
        md_duration_days = md_total_years * DAYS_PER_YEAR
        current_md_end = current_md_start + timedelta(days=md_duration_days)
        
        # Check if the target date falls within this Mahadasha
        if current_md_start <= target_datetime_utc < current_md_end:
            active_md_lord = md_lord
            active_md_start = current_md_start
            active_md_end = current_md_end
            active_md_total_years = md_total_years
            break
            
        current_md_start = current_md_end
        
    # If the target date is outside the calculated range (e.g. far in the future/past)
    if not active_md_lord:
        return {
            "currentMahadasha": "Unknown",
            "currentAntardasha": "Unknown",
            "startDate": "N/A",
            "endDate": "N/A"
        }
        
    # 6. Calculate Antardashas within the active Mahadasha.
    # The Antardasha cycle begins with the Mahadasha lord itself.
    md_lord_cycle_idx = DASHA_CYCLE.index(active_md_lord)
    current_ad_start = active_md_start
    
    for j in range(9):
        ad_lord = DASHA_CYCLE[(md_lord_cycle_idx + j) % 9]
        ad_lord_period = DASHA_PERIODS[ad_lord]
        
        # Antardasha duration = (Mahadasha period * Antardasha lord period) / 120
        ad_total_years = active_md_total_years * (ad_lord_period / 120.0)
        ad_duration_days = ad_total_years * DAYS_PER_YEAR
        current_ad_end = current_ad_start + timedelta(days=ad_duration_days)
        
        # Check if the target date falls within this Antardasha
        if current_ad_start <= target_datetime_utc < current_ad_end:
            return {
                "currentMahadasha": active_md_lord,
                "currentAntardasha": ad_lord,
                "startDate": current_ad_start.strftime("%Y-%m-%d"),
                "endDate": current_ad_end.strftime("%Y-%m-%d")
            }
            
        current_ad_start = current_ad_end
        
    # Fallback return in case of floating point precision edge cases
    return {
        "currentMahadasha": active_md_lord,
        "currentAntardasha": "Unknown",
        "startDate": active_md_start.strftime("%Y-%m-%d"),
        "endDate": active_md_end.strftime("%Y-%m-%d")
    }
