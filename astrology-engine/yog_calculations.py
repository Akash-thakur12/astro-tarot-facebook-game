from constants import RASHI_NAMES
from bhava_calculations import determine_planet_house

# Sign lords mapping
SIGN_LORDS = {
    "Aries": "mars",
    "Taurus": "venus",
    "Gemini": "mercury",
    "Cancer": "moon",
    "Leo": "sun",
    "Virgo": "mercury",
    "Libra": "venus",
    "Scorpio": "mars",
    "Sagittarius": "jupiter",
    "Capricorn": "saturn",
    "Aquarius": "saturn",
    "Pisces": "jupiter"
}

DEBILITATED_PLANETS = {
    "sun": "Libra",
    "moon": "Scorpio",
    "mars": "Cancer",
    "mercury": "Pisces",
    "jupiter": "Capricorn",
    "venus": "Virgo",
    "saturn": "Aries"
}

EXALTED_PLANETS = {
    "sun": "Aries",
    "moon": "Taurus",
    "mars": "Capricorn",
    "mercury": "Virgo",
    "jupiter": "Cancer",
    "venus": "Pisces",
    "saturn": "Libra"
}

def get_navamsa_rashi(longitude: float) -> str:
    """
    Calculates the Navamsa (D9) sign name for a given sidereal longitude.
    """
    # 360 degrees / 108 divisions = 10/3 degrees per division.
    # Add a small tolerance to handle floating point boundary precision (e.g. 30.0).
    div_num = int((longitude % 360) / (10.0 / 3.0) + 1e-9)
    rashi_idx = div_num % 12
    return RASHI_NAMES[rashi_idx]

def detect_yogas(
    positions: dict[str, float],
    placements: dict[str, int],
    bhava_chart: dict[str, str]
) -> list[dict]:
    """
    Detects classical Vedic Yogas based on planetary longitudes, house placements, and house lords.
    """
    yogas = []
    
    # Pre-calculate Rashi for each planet
    planet_rashis = {}
    for p, lon in positions.items():
        rashi_idx = int((lon % 360) // 30)
        planet_rashis[p] = RASHI_NAMES[rashi_idx]
        
    # Get house lords
    # house1 -> lagna rashi
    # house lords are the lords of the signs of the houses
    house_lords = {}
    for h in range(1, 13):
        rashi = bhava_chart[f"house{h}"]
        house_lords[h] = SIGN_LORDS[rashi]
        
    # 1. Gaj Kesari Yog
    # Jupiter is in Kendra (1, 4, 7, 10) from the Moon
    moon_house = placements["moonHouse"]
    jupiter_house = placements["jupiterHouse"]
    rel_house_jup_from_moon = (jupiter_house - moon_house) % 12 + 1
    
    if rel_house_jup_from_moon in [1, 4, 7, 10]:
        # Exalted or own signs
        is_strong = planet_rashis["jupiter"] in ["Cancer", "Sagittarius", "Pisces"]
        strength = "strong" if is_strong else "medium"
        yogas.append({
            "name": "Gaj Kesari Yog",
            "strength": strength,
            "reason": f"Jupiter is in House {rel_house_jup_from_moon} (a Kendra) from the Moon, placed in {planet_rashis['jupiter']}"
        })
        
    # 2. Budhaditya Yog
    # Sun and Mercury in the same sign
    if planet_rashis["sun"] == planet_rashis["mercury"]:
        is_strong = planet_rashis["sun"] in ["Aries", "Leo", "Virgo"]
        strength = "strong" if is_strong else "medium"
        yogas.append({
            "name": "Budhaditya Yog",
            "strength": strength,
            "reason": f"Sun and Mercury are conjunct in the sign of {planet_rashis['sun']}"
        })
        
    # 3. Neech Bhang Raj Yog
    # Debilitated planet where the lord of its debilitation sign is in Kendra from Lagna or Moon
    neech_bhang_reasons = []
    for planet, deb_rashi in DEBILITATED_PLANETS.items():
        if planet_rashis[planet] == deb_rashi:
            # Debilitated! Now check for cancellation (Neech Bhang)
            # 1st cancellation: Lord of the debilitation sign is in a Kendra from Lagna
            lord = SIGN_LORDS[deb_rashi]
            lord_house = placements[f"{lord}House"]
            if lord_house in [1, 4, 7, 10]:
                neech_bhang_reasons.append(
                    f"{planet.capitalize()} is debilitated in {deb_rashi}, but its lord {lord.capitalize()} is in Kendra House {lord_house} from Lagna"
                )
                continue
            # 2nd cancellation: Lord of the debilitation sign is in a Kendra from Moon
            rel_lord_from_moon = (lord_house - moon_house) % 12 + 1
            if rel_lord_from_moon in [1, 4, 7, 10]:
                neech_bhang_reasons.append(
                    f"{planet.capitalize()} is debilitated in {deb_rashi}, but its lord {lord.capitalize()} is in Kendra House {rel_lord_from_moon} from Moon"
                )
                continue
                
    if neech_bhang_reasons:
        yogas.append({
            "name": "Neech Bhang Raj Yog",
            "strength": "strong",
            "reason": "; ".join(neech_bhang_reasons)
        })
        
    # 4. Raj Yog
    # Kendra lord (1, 4, 7, 10) and Trikona lord (1, 5, 9) are conjunct (in the same house)
    raj_yog_reasons = []
    kendra_lords = {house_lords[h]: h for h in [1, 4, 7, 10]}
    trikona_lords = {house_lords[h]: h for h in [1, 5, 9]}
    
    # Check if a planet is both a Kendra and Trikona lord (Yoga Karaka)
    yogakaraka = set(kendra_lords.keys()).intersection(set(trikona_lords.keys()))
    for yk in yogakaraka:
        yk_house = placements[f"{yk}House"]
        # Standard Yoga Karaka check: Saturn for Taurus/Libra Lagna, Mars for Cancer/Leo Lagna
        # We ensure it rules distinct houses (or lagna itself)
        if kendra_lords[yk] != trikona_lords[yk] or kendra_lords[yk] == 1:
            raj_yog_reasons.append(
                f"{yk.capitalize()} acts as a Yogakaraka (rules both Kendra House {kendra_lords[yk]} and Trikona House {trikona_lords[yk]}) and is in House {yk_house}"
            )
        
    # Check conjunctions between Kendra lord and Trikona lord
    for kl, k_num in kendra_lords.items():
        for tl, t_num in trikona_lords.items():
            if kl != tl:
                kl_house = placements[f"{kl}House"]
                tl_house = placements[f"{tl}House"]
                if kl_house == tl_house:
                    raj_yog_reasons.append(
                        f"Kendra lord {kl.capitalize()} (House {k_num}) and Trikona lord {tl.capitalize()} (House {t_num}) are conjunct in House {kl_house}"
                    )
                    
    if raj_yog_reasons:
        yogas.append({
            "name": "Raj Yog",
            "strength": "strong",
            "reason": "; ".join(raj_yog_reasons)
        })
        
    # 5. Dharma Karmadhipati Yog
    # Connection between 9th lord (Dharma) and 10th lord (Karma)
    lord_9 = house_lords[9]
    lord_10 = house_lords[10]
    house_9 = placements[f"{lord_9}House"]
    house_10 = placements[f"{lord_10}House"]
    
    if house_9 == house_10:
        yogas.append({
            "name": "Dharma Karmadhipati Yog",
            "strength": "strong",
            "reason": f"Dharma lord {lord_9.capitalize()} (9th) and Karma lord {lord_10.capitalize()} (10th) are conjunct in House {house_9}"
        })
    elif house_9 == 10 and house_10 == 9:
        yogas.append({
            "name": "Dharma Karmadhipati Yog",
            "strength": "strong",
            "reason": f"Dharma lord {lord_9.capitalize()} and Karma lord {lord_10.capitalize()} are in exchange (Parivartana) between Houses 9 and 10"
        })
        
    # 6. Vipreet Raj Yog
    # Lords of 6, 8, 12 are in 6, 8, or 12
    vry_reasons = []
    for evil_house in [6, 8, 12]:
        lord = house_lords[evil_house]
        lord_house = placements[f"{lord}House"]
        if lord_house in [6, 8, 12]:
            vry_reasons.append(
                f"Dusthana lord {lord.capitalize()} (of House {evil_house}) is placed in Dusthana House {lord_house}"
            )
            
    if vry_reasons:
        yogas.append({
            "name": "Vipreet Raj Yog",
            "strength": "medium",
            "reason": "; ".join(vry_reasons)
        })
        
    # 7. Chandra Mangal Yog
    # Moon and Mars conjunct or in mutual aspect (7th house apart)
    mars_house = placements["marsHouse"]
    rel_mars_from_moon = (mars_house - moon_house) % 12 + 1
    if rel_mars_from_moon in [1, 7]:
        yogas.append({
            "name": "Chandra Mangal Yog",
            "strength": "medium",
            "reason": f"Moon and Mars are conjunct or in mutual aspect (Mars is in House {rel_mars_from_moon} from Moon)"
        })
        
    # 8. Lakshmi Yog
    # 9th lord is in Kendra/Trikona and exalted/own sign
    lord_9 = house_lords[9]
    lord_9_house = placements[f"{lord_9}House"]
    lord_9_rashi = planet_rashis[lord_9]
    
    if lord_9_house in [1, 4, 7, 10, 5, 9]:
        is_exalted = EXALTED_PLANETS.get(lord_9) == lord_9_rashi
        is_own = SIGN_LORDS.get(lord_9_rashi) == lord_9
        if is_exalted or is_own:
            yogas.append({
                "name": "Lakshmi Yog",
                "strength": "strong",
                "reason": f"9th Lord {lord_9.capitalize()} is in Kendra/Trikona House {lord_9_house} and is exalted or in own sign ({lord_9_rashi})"
            })
            
    return yogas
