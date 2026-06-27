from datetime import datetime, timedelta
import swisseph as swe
from constants import RASHI_NAMES
from calculations import calculate_planetary_positions
from yog_calculations import SIGN_LORDS, EXALTED_PLANETS, DEBILITATED_PLANETS
from marriage_calculations import get_dasha_at_time

def calculate_career_promise(
    positions: dict[str, float],
    placements: dict[str, int],
    bhava_chart: dict[str, str],
    yogas: list[dict]
) -> tuple[int, str, dict]:
    """
    Evaluates Career Promise Score (0-100) and Potential ("High", "Medium", "Low").
    """
    explanation = {}
    
    # 1. 10th House Strength (baseline 10)
    benefics = ["moon", "mercury", "venus", "jupiter"]
    h10_score = 10
    
    # Add for benefics in 10th
    for p in benefics:
        if placements.get(f"{p}House") == 10:
            h10_score += 5
            
    # Subtract for Rahu/Ketu affliction
    if placements.get("rahuHouse") == 10 or placements.get("ketuHouse") == 10:
        h10_score -= 10
        
    h10_score = max(0, min(20, h10_score))
    explanation["10thHouseStrength"] = f"{h10_score}/20 (benefics or Rahu/Ketu in the 10th house)"
    
    # 2. 10th Lord Strength (baseline 12)
    lord_10 = SIGN_LORDS[bhava_chart["house10"]]
    lord_10_house = placements.get(f"{lord_10}House", 1)
    lord_10_rashi = RASHI_NAMES[int((positions[lord_10] % 360) // 30)]
    
    lord10_score = 12
    if lord_10_house in [1, 4, 7, 10, 5, 9]:
        lord10_score += 8
    elif lord_10_house in [6, 8, 12]:
        lord10_score -= 8
        
    if EXALTED_PLANETS.get(lord_10) == lord_10_rashi:
        lord10_score += 8
    elif DEBILITATED_PLANETS.get(lord_10) == lord_10_rashi:
        lord10_score -= 8
        
    lord10_score = max(0, min(20, lord10_score))
    explanation["10thLordStrength"] = f"{lord10_score}/20 (lord of 10th house: {lord_10.capitalize()} in House {lord_10_house})"
    
    # 3. Saturn (Karma Karaka) Strength (baseline 10)
    saturn_house = placements.get("saturnHouse", 1)
    saturn_rashi = RASHI_NAMES[int((positions["saturn"] % 360) // 30)]
    
    saturn_score = 10
    if saturn_house in [1, 4, 7, 10, 5, 9]:
        saturn_score += 5
    elif saturn_house in [6, 8, 12]:
        saturn_score -= 5
        
    if EXALTED_PLANETS.get("saturn") == saturn_rashi or saturn_rashi in ["Capricorn", "Aquarius"]:
        saturn_score += 5
    elif saturn_rashi == "Aries":
        saturn_score -= 5
        
    saturn_score = max(0, min(15, saturn_score))
    explanation["saturnStrength"] = f"{saturn_score}/15 (Saturn sign and house placement)"
    
    # 4. Jupiter Support (baseline 8)
    # Jupiter aspects 10th house if in house 10, 6, 2, or 4
    jup_house = placements.get("jupiterHouse", 1)
    jupiter_score = 8
    if jup_house in [10, 6, 2, 4]:
        jupiter_score += 7
    elif jup_house in [1, 4, 7, 10, 5, 9]:
        jupiter_score += 3
        
    jupiter_score = max(0, min(15, jupiter_score))
    explanation["jupiterSupport"] = f"{jupiter_score}/15 (Jupiter aspect or placement relative to the 10th house)"
    
    # 5. Raj Yog Presence
    raj_yog_score = 0
    yog_names = [y["name"] for y in yogas]
    if "Raj Yog" in yog_names:
        raj_yog_score = 15
    explanation["rajYogPresence"] = f"{raj_yog_score}/15 (conjunction of Kendra and Trikona lords)"
    
    # 6. Dharma Karmadhipati Yog
    dk_yog_score = 0
    if "Dharma Karmadhipati Yog" in yog_names:
        dk_yog_score = 10
    explanation["dharmaKarmadhipatiYog"] = f"{dk_yog_score}/10 (9th and 10th lord connection)"
    
    # 7. D10 Readiness (Placeholder for future divisional analysis)
    d10_score = 5
    explanation["d10Readiness"] = f"{d10_score}/5 (baseline D10 divisional readiness)"
    
    promise_score = h10_score + lord10_score + saturn_score + jupiter_score + raj_yog_score + dk_yog_score + d10_score
    
    if promise_score >= 75:
        potential = "High"
    elif promise_score >= 50:
        potential = "Medium"
    else:
        potential = "Low"
        
    return promise_score, potential, explanation

def calculate_career_timing_windows(
    moon_longitude: float,
    birth_datetime_utc: datetime,
    lagna_rashi: str,
    bhava_chart: dict[str, str],
    placements: dict[str, int],
    current_time_utc: datetime
) -> tuple[list[dict], list[dict]]:
    """
    Scans the next 10 years (monthly intervals) for Career Windows and Promotion Windows.
    """
    lagna_idx = RASHI_NAMES.index(lagna_rashi)
    lord_10 = SIGN_LORDS[bhava_chart["house10"]]
    saturn_house = placements.get("saturnHouse", 1)
    
    # Identify planets in the 10th house
    planets_in_10 = []
    for p in ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]:
        if placements.get(f"{p}House") == 10:
            planets_in_10.append(p)
            
    supportive_career_months = []
    supportive_promo_months = []
    
    start_dt = current_time_utc
    for m in range(120):
        target_dt = start_dt + timedelta(days=m * 30.4375)
        
        # A. Dasha Support
        md_lord, ad_lord = get_dasha_at_time(moon_longitude, birth_datetime_utc, target_dt)
        
        dasha_score = 0.0
        # MD Lord support
        if md_lord == lord_10:
            dasha_score += 2.0
        elif md_lord in ["saturn", "jupiter"] or md_lord in planets_in_10:
            dasha_score += 1.0
            
        # AD Lord support
        if ad_lord == lord_10:
            dasha_score += 2.0
        elif ad_lord in ["saturn", "jupiter"] or ad_lord in planets_in_10:
            dasha_score += 1.0
            
        # B. Transit Support
        decimal_hour = target_dt.hour + target_dt.minute / 60.0 + target_dt.second / 3600.0
        jd_ut = swe.julday(target_dt.year, target_dt.month, target_dt.day, decimal_hour, swe.GREG_CAL)
        
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        
        # Transit Jupiter
        res_jup, _ = swe.calc_ut(jd_ut, swe.JUPITER, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        jup_rashi_idx = int((res_jup[0] % 360) // 30)
        jup_rel_house = (jup_rashi_idx - lagna_idx) % 12 + 1
        
        # Transit Saturn
        res_sat, _ = swe.calc_ut(jd_ut, swe.SATURN, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        sat_rashi_idx = int((res_sat[0] % 360) // 30)
        sat_rel_house = (sat_rashi_idx - lagna_idx) % 12 + 1
        
        # Transit Sun (for Promotion)
        res_sun, _ = swe.calc_ut(jd_ut, swe.SUN, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        sun_rashi_idx = int((res_sun[0] % 360) // 30)
        sun_rel_house = (sun_rashi_idx - lagna_idx) % 12 + 1
        
        transit_score = 0.0
        # Jupiter aspects 10th if placed in 10, 6, 2, 4
        if jup_rel_house in [10, 6, 2, 4]:
            transit_score += 3.0
        elif jup_rel_house in [1, 5, 9]:
            transit_score += 1.0
            
        # Saturn aspects 10th if placed in 10, 8, 4, 1
        if sat_rel_house in [10, 8, 4, 1]:
            transit_score += 2.0
            
        combined_score = dasha_score + transit_score
        
        # If combined score indicates support
        if combined_score >= 4.0:
            confidence = min(0.95, combined_score / 7.0)
            
            # Format reasons
            reasons = []
            if md_lord == lord_10 or ad_lord == lord_10:
                reasons.append("10th lord dasha activation")
            if jup_rel_house in [10, 6, 2, 4]:
                reasons.append("Jupiter transit support to 10th house")
            if sat_rel_house in [10, 8, 4, 1]:
                reasons.append("Saturn transit support to 10th house")
                
            reason_str = " + ".join(reasons) if reasons else "Career support activation"
            
            month_info = {
                "date": target_dt,
                "confidence": round(confidence, 2),
                "reason": reason_str
            }
            
            supportive_career_months.append(month_info)
            
            # Promotion triggers if Sun transits in Kendra (1, 4, 7, 10) relative to Lagna
            if sun_rel_house in [1, 4, 7, 10]:
                supportive_promo_months.append({
                    "date": target_dt,
                    "confidence": round(confidence * 1.1 if confidence * 1.1 <= 0.95 else 0.95, 2),
                    "reason": f"Kendra transit of Sun (House {sun_rel_house}) + {reason_str}"
                })
                
    # Helper to merge consecutive months
    def merge_months(months_list):
        merged = []
        if not months_list:
            return merged
            
        start_m = None
        prev_m = None
        
        for m_data in months_list:
            if start_m is None:
                start_m = m_data
                prev_m = m_data
            else:
                if (m_data["date"] - prev_m["date"]).days <= 45:
                    prev_m = m_data
                else:
                    merged.append({
                        "start": start_m["date"].strftime("%Y-%m"),
                        "end": prev_m["date"].strftime("%Y-%m"),
                        "confidence": start_m["confidence"],
                        "reason": start_m["reason"]
                    })
                    start_m = m_data
                    prev_m = m_data
                    
        if start_m is not None:
            merged.append({
                "start": start_m["date"].strftime("%Y-%m"),
                "end": prev_m["date"].strftime("%Y-%m"),
                "confidence": start_m["confidence"],
                "reason": start_m["reason"]
            })
        return merged
        
    career_windows = merge_months(supportive_career_months)
    promotion_windows = merge_months(supportive_promo_months)
    
    return career_windows, promotion_windows
