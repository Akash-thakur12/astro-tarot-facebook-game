from datetime import datetime, timezone
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import swisseph as swe

from calculations import (
    calculate_julian_day,
    calculate_planetary_positions,
    calculate_lagna,
    get_rashi_name,
    get_nakshatra_details,
    calculate_vimshottari_dasha,
)

from bhava_calculations import (
    calculate_bhava_chart,
    calculate_planet_placements,
    calculate_drishti_aspects,
    detect_manglik_dosha,
)

from yog_calculations import (
    get_navamsa_rashi,
    detect_yogas,
)

from transit_calculations import calculate_transits
from marriage_calculations import calculate_marriage_promise, calculate_marriage_timing_windows
from career_calculations import calculate_career_promise, calculate_career_timing_windows

app = FastAPI(
    title="Vedic Astrology Engine",
    description="A production-ready astrology engine powered by Swiss Ephemeris.",
    version="1.0.0"
)

class BirthDetails(BaseModel):
    date: str = Field(..., description="Date of birth in YYYY-MM-DD format", examples=["1990-01-01"])
    time: str = Field(..., description="Local birth time in HH:MM:SS format", examples=["12:00:00"])
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Geographic latitude of birth place (positive North)", examples=[12.9716])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Geographic longitude of birth place (positive East)", examples=[77.5946])
    timezone: float = Field(..., ge=-12.0, le=14.0, description="Timezone offset relative to UTC in hours", examples=[5.5])

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        clean_v = v.strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", clean_v):
            raise ValueError("Date must be in YYYY-MM-DD format")
        try:
            datetime.strptime(clean_v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid calendar date")
        return clean_v

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        clean_v = v.strip()
        if re.match(r"^\d{2}:\d{2}:\d{2}$", clean_v):
            fmt = "%H:%M:%S"
        elif re.match(r"^\d{2}:\d{2}$", clean_v):
            fmt = "%H:%M"
        else:
            raise ValueError("Time must be in HH:MM:SS or HH:MM format")
        try:
            datetime.strptime(clean_v, fmt)
        except ValueError:
            raise ValueError("Invalid time values")
        return clean_v

@app.get("/")
def read_root():
    """
    Status endpoint to confirm that the service is running.
    """
    return {"status": "Astrology Engine Running"}

@app.get("/test")
def test_swisseph():
    """
    Test endpoint to verify integration with Swiss Ephemeris and print its version.
    """
    return {"swisseph": swe.version}

@app.post("/kundli")
def get_kundli(details: BirthDetails):
    """
    Generates a full Vedic horoscope (Kundli) from the provided birth details.
    
    Includes:
    - Phase 1: Planetary sidereal longitudes (0-360) using Lahiri ayanamsha
    - Phase 2: Lagna (Ascendant), Moon Rashi/Nakshatra/Pada, and Rashis for all planets
    - Phase 3: Active Vimshottari Mahadasha/Antardasha for the current request time
    """
    # 1. Parse date/time and convert birth details to Julian Day (UT) and UTC datetime
    jd_ut, birth_datetime_utc = calculate_julian_day(details.date, details.time, details.timezone)
    
    # 2. Calculate planetary longitudes (Lahiri Ayanamsha)
    positions = calculate_planetary_positions(jd_ut)
    
    # 3. Calculate Ascendant (Lagna) longitude and its corresponding Rashi (Sign)
    lagna_deg = calculate_lagna(jd_ut, details.latitude, details.longitude)
    lagna_rashi = get_rashi_name(lagna_deg)
    
    # 4. Calculate Nakshatra and Pada for Moon, and Rashi (zodiac sign) for all planets
    moon_nakshatra, _, moon_pada = get_nakshatra_details(positions["moon"])
    moon_rashi = get_rashi_name(positions["moon"])
    
    # 5. Calculate Vimshottari Dasha details active at the current moment of request
    current_time_utc = datetime.now(timezone.utc)
    dasha = calculate_vimshottari_dasha(positions["moon"], birth_datetime_utc, current_time_utc)
    
    # 6. Calculate Bhava Chart, Planet placements, aspects (Drishti), and Manglik status
    bhava_chart, raw_cusps = calculate_bhava_chart(jd_ut, details.latitude, details.longitude)
    placements = calculate_planet_placements(positions, raw_cusps)
    aspects = calculate_drishti_aspects(placements)
    manglik = detect_manglik_dosha(placements)
    
    # 7. Calculate Navamsa (D9) signs
    navamsa = {
        "sunNavamsa": get_navamsa_rashi(positions["sun"]),
        "moonNavamsa": get_navamsa_rashi(positions["moon"]),
        "marsNavamsa": get_navamsa_rashi(positions["mars"]),
        "mercuryNavamsa": get_navamsa_rashi(positions["mercury"]),
        "jupiterNavamsa": get_navamsa_rashi(positions["jupiter"]),
        "venusNavamsa": get_navamsa_rashi(positions["venus"]),
        "saturnNavamsa": get_navamsa_rashi(positions["saturn"]),
        "rahuNavamsa": get_navamsa_rashi(positions["rahu"]),
        "ketuNavamsa": get_navamsa_rashi(positions["ketu"]),
        "lagnaNavamsa": get_navamsa_rashi(lagna_deg),
    }
    
    # 8. Detect classical Vedic Yogas
    yogas = detect_yogas(positions, placements, bhava_chart)
    
    # 9. Calculate Real-time transits (Gochar) relative to natal chart
    transits = calculate_transits(lagna_rashi, moon_rashi, current_time_utc)
    
    # 10. Compile and return the complete structured payload
    response = {
        # Phase 1: Planetary positions (longitudes)
        "sun": positions["sun"],
        "moon": positions["moon"],
        "mars": positions["mars"],
        "mercury": positions["mercury"],
        "jupiter": positions["jupiter"],
        "venus": positions["venus"],
        "saturn": positions["saturn"],
        "rahu": positions["rahu"],
        "ketu": positions["ketu"],
        
        # Phase 2: Lagna, Moon Rashi, Nakshatra, Pada
        "lagna": lagna_rashi,
        "moonRashi": moon_rashi,
        "moonNakshatra": moon_nakshatra,
        "moonPada": moon_pada,
        
        # Rashis for all other planets
        "sunRashi": get_rashi_name(positions["sun"]),
        "marsRashi": get_rashi_name(positions["mars"]),
        "mercuryRashi": get_rashi_name(positions["mercury"]),
        "jupiterRashi": get_rashi_name(positions["jupiter"]),
        "venusRashi": get_rashi_name(positions["venus"]),
        "saturnRashi": get_rashi_name(positions["saturn"]),
        "rahuRashi": get_rashi_name(positions["rahu"]),
        "ketuRashi": get_rashi_name(positions["ketu"]),
        
        # Phase 3: Active Vimshottari Dasha
        "currentMahadasha": dasha["currentMahadasha"],
        "currentAntardasha": dasha["currentAntardasha"],
        "startDate": dasha["startDate"],
        "endDate": dasha["endDate"],
    }
    
    # Merge Phase 4 & Divisional/Yog results
    response.update(bhava_chart)
    response.update(placements)
    response.update(aspects)
    response.update(manglik)
    response.update(navamsa)
    response["yogas"] = yogas
    
    # Merge Phase 3 Transit results
    response.update(transits["transitHouses"])
    response.update({
        "isSadeSati": transits["isSadeSati"],
        "phase": transits["phase"],
        "isDhaiya": transits["isDhaiya"],
        "type": transits["type"],
        "transitPositions": transits["transitPositions"]
    })
    
    # 10. Calculate Marriage Promise and Timing Windows
    promise_score, potential, explanation = calculate_marriage_promise(
        positions, placements, bhava_chart, navamsa, manglik
    )
    windows = calculate_marriage_timing_windows(
        positions["moon"], birth_datetime_utc, lagna_rashi, moon_rashi,
        bhava_chart, placements, current_time_utc
    )
    
    # Merge Marriage Results
    response.update({
        "marriagePromiseScore": promise_score,
        "marriagePotential": potential,
        "marriageExplanation": explanation,
        "marriageWindows": windows
    })
    
    # 11. Calculate Career Promise and Timing/Promotion Windows
    c_score, c_potential, c_explanation = calculate_career_promise(
        positions, placements, bhava_chart, yogas
    )
    c_windows, p_windows = calculate_career_timing_windows(
        positions["moon"], birth_datetime_utc, lagna_rashi,
        bhava_chart, placements, current_time_utc
    )
    
    # Merge Career Results
    response.update({
        "careerScore": c_score,
        "careerPotential": c_potential,
        "careerExplanation": c_explanation,
        "careerWindows": c_windows,
        "promotionWindows": p_windows
    })
    
    return response

class PanditRequest(BaseModel):
    question: str = Field(..., description="The user question")
    astrology_data: dict = Field(..., description="The structured astrology JSON from the engine")

PLANETS_TERMS = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
    "surya", "chandra", "mangal", "budh", "guru", "brihaspati", "shukra", "shani",
    "graha", "grah", "planets", "planet"
]

DASHA_TERMS = ["dasha", "mahadasha", "antardasha", "vimshottari", "period"]

HOUSE_TERMS = [
    "house", "bhava", "bhav", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", 
    "8th", "9th", "10th", "11th", "12th", "pratham", "dwitiya", "tritiya", 
    "chaturth", "pancham", "shashth", "saptam", "ashtam", "navam", "dasham", 
    "ekadash", "dvadash"
]

YOGA_TERMS = ["yoga", "yog", "gaj kesari", "chandal", "kemdrum", "anapha", "sunapha"]

def classify_question(question: str) -> str:
    import re
    q = question.lower().strip()
    q_clean = re.sub(r"[^\w\s]", "", q)
    
    greetings = {
        "hi", "hello", "hey", "namaste", "pranam", "pranaam", "suno", 
        "baba", "pandit", "hola", "greetings", "hii", "heyy", "radhe", "radhe radhe", 
        "jai", "shree", "ram", "hlo", "ji", "panditji", "pandiji", "pandi"
    }
    
    words = q_clean.split()
    if words and all(w in greetings for w in words):
        return "greeting"
        
    career_keywords = [
        "career", "job", "work", "business", "promotion", "naukri", "pesha", 
        "tarakki", "vyavsay", "exam", "study", "padhai", "success", "kamiyabi", 
        "sarkari", "office", "salary", "dhandha", "rozgar", "naukari", "interview", 
        "safalta", "aamdani", "kamai", "vetan", "sector", "teaching", "teacher",
        "freelance", "freelancing", "company", "startup", "army", "selection",
        "upsc", "engineering", "engineer", "medical", "doctor", "transfer",
        "boss", "income", "venture", "professional", "growth", "leadership",
        "leader", "role", "authority", "position", "field"
    ]
    marriage_keywords = [
        "marriage", "marry", "love", "wedding", "spouse", "wife", "husband", 
        "shaadi", "shadi", "vivah", "rishta", "patni", "pati", "manglik", 
        "humsafar", "prem", "vivaah", "saathi", "milan", "dosh", "partner",
        "divorce", "engagement", "married", "pyaar", "pyar", "crush", "ex",
        "romance", "emotional", "compat", "relationship", "relation", "patchup",
        "soulmate", "commitment", "family"
    ]
    
    unsupported_finance = ["karz", "nivesh", "property", "lottery", "paisa", "karza", "dhan"]
    if any(term in q_clean for term in unsupported_finance):
        return "unsupported"
        
    def has_keyword(q_text: str, keywords: list) -> bool:
        for kw in keywords:
            if len(kw) <= 2:
                pattern = rf"\b{re.escape(kw)}\b"
                if re.search(pattern, q_text):
                    return True
            else:
                if kw in q_text:
                    return True
        return False
        
    has_career = has_keyword(q_clean, career_keywords)
    has_marriage = has_keyword(q_clean, marriage_keywords)
    
    if has_career and not has_marriage:
        return "career"
    elif has_marriage and not has_career:
        return "marriage"
    elif has_career and has_marriage:
        marriage_overrides = ["shaadi", "shadi", "vivah", "vivaah", "marriage", "wedding", "husband", "wife", "spouse"]
        if any(term in q_clean for term in marriage_overrides):
            return "marriage"
        career_overrides = ["business", "job", "naukri", "career", "salary", "promotion", "work", "office", "vetan", "aamdani"]
        if any(term in q_clean for term in career_overrides):
            return "career"
        return "marriage"
    else:
        return "unsupported"

def check_allowed_categories(data: dict) -> dict:
    import json
    data_str = json.dumps(data).lower()
    
    planets_found = any(term in data_str for term in ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
                                                     "surya", "chandra", "mangal", "budh", "guru", "brihaspati", "shukra", "shani"])
    dasha_found = any(term in data_str for term in ["dasha", "mahadasha", "antardasha", "vimshottari"])
    houses_found = any(term in data_str for term in ["house", "bhava", "bhav", "placement"])
    yogas_found = any(term in data_str for term in ["yoga", "yog", "gaj kesari", "chandal", "kemdrum", "anapha", "sunapha"])
    
    return {
        "planets": planets_found,
        "dasha": dasha_found,
        "houses": houses_found,
        "yogas": yogas_found
    }

def get_date_variations(date_str: str) -> list:
    import re
    import calendar
    variations = [date_str.lower()]
    match = re.match(r"^(\d{4})-(\d{2})$", date_str)
    if match:
        year, month = match.groups()
        month_idx = int(month)
        if 1 <= month_idx <= 12:
            month_name = calendar.month_name[month_idx].lower()
            month_abbr = calendar.month_abbr[month_idx].lower()
            variations.extend([
                year,
                month,
                month_name,
                month_abbr,
                f"{month_name} {year}",
                f"{month_abbr} {year}",
                f"{month_name} of {year}",
                f"{month_abbr} of {year}"
            ])
    return variations

def extract_allowed_dates(data: dict) -> set:
    allowed_dates = set()
    for key in ["marriageWindows", "careerWindows", "promotionWindows", "transitWindows", "transit_windows"]:
        if key in data:
            windows = data[key]
            if isinstance(windows, list):
                for w in windows:
                    if isinstance(w, dict):
                        for k, v in w.items():
                            if isinstance(v, str):
                                allowed_dates.update(get_date_variations(v))
    return allowed_dates

def check_forbidden_terms(text: str, allowed: dict) -> list:
    import re
    violated = []
    text_lower = text.lower()
    
    if not allowed["planets"]:
        for term in PLANETS_TERMS:
            pattern = rf"\b{re.escape(term)}\b"
            if re.search(pattern, text_lower):
                violated.append(f"planet:{term}")
                
    if not allowed["dasha"]:
        for term in DASHA_TERMS:
            pattern = rf"\b{re.escape(term)}\b"
            if re.search(pattern, text_lower):
                violated.append(f"dasha:{term}")
                
    if not allowed["houses"]:
        for term in HOUSE_TERMS:
            pattern = rf"\b{re.escape(term)}\b"
            if re.search(pattern, text_lower):
                violated.append(f"house:{term}")
                
    if not allowed["yogas"]:
        for term in YOGA_TERMS:
            pattern = rf"\b{re.escape(term)}\b"
            if re.search(pattern, text_lower):
                violated.append(f"yoga:{term}")
                
    return violated

def check_dates_in_text(text: str, allowed_dates: set) -> bool:
    import re
    # 1. Check for any 4-digit years
    years = re.findall(r"\b(19\d{2}|20\d{2})\b", text)
    for y in years:
        if y not in allowed_dates:
            return False
            
    # 2. Check for month names
    months = ["january", "february", "march", "april", "may", "june",
              "july", "august", "september", "october", "november", "december",
              "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    for m in months:
        pattern = rf"\b{m}\b"
        if re.search(pattern, text.lower()):
            if m not in allowed_dates:
                return False
                
    # 3. Check for YYYY-MM format
    date_patterns = re.findall(r"\b\d{4}-\d{2}\b", text)
    for dp in date_patterns:
        if dp not in allowed_dates:
            return False
            
    return True

def format_window_natural(start_str: str, end_str: str) -> str:
    import re
    match_start = re.match(r"^(\d{4})-(\d{2})$", start_str)
    match_end = re.match(r"^(\d{4})-(\d{2})$", end_str)
    
    months_en = [
        "", "January", "February", "March", "April", "May", "june",
        "July", "August", "September", "October", "November", "December"
    ]
    
    if match_start and match_end:
        sy, sm = match_start.groups()
        ey, em = match_end.groups()
        sm_idx = int(sm)
        em_idx = int(em)
        
        if 1 <= sm_idx <= 12 and 1 <= em_idx <= 12:
            start_m = months_en[sm_idx]
            end_m = months_en[em_idx]
            
            if start_str == end_str:
                return f"{start_m} {sy}"
            elif sy == ey:
                return f"{start_m} se {end_m} {sy} ke beech"
            else:
                return f"{start_m} {sy} se {end_m} {ey} ke beech"
                
    return f"{start_str} to {end_str}"

def score_to_natural(score: int) -> str:
    if score >= 75:
        return "yog kaafi mazboot dikh rahe hain."
    elif score >= 60:
        return "achhi sambhavnayein dikh rahi hain."
    elif score >= 40:
        return "parinaam mehnat ke saath mil sakte hain."
    else:
        return "thodi adhik satarkta aur prayas ki zarurat rahegi."

def check_forbidden_outputs(text: str) -> list:
    import re
    text_lower = text.lower()
    violated = []
    
    forbidden = ["score", "promise score", "confidence score", "confidence", "window"]
    for word in forbidden:
        pattern = rf"\b{re.escape(word)}\b"
        if re.search(pattern, text_lower):
            violated.append(f"forbidden_word:{word}")
            
    # Raw date format check (e.g. 2026-11)
    if re.search(r"\b\d{4}-\d{2}\b", text):
        violated.append("forbidden_format:YYYY-MM")
        
    return violated

def get_generic_fallback(question: str, name: str) -> str:
    import re
    q = question.lower()
    
    guidance = "Jeevan me shanti aur safalta ke liye prayas karte rahein."
    remedy = "Apne bado ka aashirvad lein aur roz prarthana karein."
    
    if any(w in q for w in ["finance", "pais", "dhan", "karz", "nivesh", "property", "aamdani", "wealth", "money"]):
        guidance = "Mehnat ke saath arthik sthirta dheere-dheere behtar hogi."
        remedy = "Roz subah surya dev ko jal arpan karein."
    elif any(w in q for w in ["health", "swasthya", "bimari", "recovery", "tanav", "energy", "fitness"]):
        guidance = "Swayam par dhyan dein aur achhi jeevan shaili apnayein."
        remedy = "Roz subah Hanuman Chalisa ka paath karein."
    elif any(w in q for w in ["love", "prem", "breakup", "relationship", "soulmate", "partner", "pyaar"]):
        guidance = "Rishton me aapsi samajh aur saiyam banaye rakhein."
        remedy = "Mandir me ghee ka diya jalayein aur shanti ki prarthana karein."
    elif any(w in q for w in ["bhoot", "lottery", "winner", "crypto", "share", "color", "match", "barish", "password"]):
        guidance = "Man ko shant rakhein aur behuda khayalon se door rahein."
        remedy = "Roz Gayatri Mantra ka 11 baar jaap karein."
        
    return f"{name} Beta, is vishay ki poori jankari ke liye vistaar se kundli vishleshan chahiye aur iska astrology data mere paas uplabdh nahi hai.\n\nFilhal samanya vichar ke anusar {guidance}\n\nUpay: {remedy}\n\nKya aap career ya vivah ke baare me jaanna chahenge? Uske liye anukool yog ki ganana uplabdh hai."

def fallback_interpret(question: str, data: dict, category: str) -> dict:
    if category == "greeting":
        return {
            "answer": "Namaste!\nAapka swagat hai.\nMain aapke career aur vivah se jude prashnon par jyotishiya margdarshan de sakta hoon.\n\nAap kya jaanna chahenge?",
            "confidence": "high",
            "sources_used": []
        }
    elif category == "career":
        score = data.get("careerScore")
        potential = data.get("careerPotential")
        windows = data.get("careerWindows")
        promo_windows = data.get("promotionWindows")
        
        sources = []
        if "careerScore" in data: sources.append("careerScore")
        if "careerPotential" in data: sources.append("careerPotential")
        if "careerWindows" in data: sources.append("careerWindows")
        if "promotionWindows" in data: sources.append("promotionWindows")
        
        ans_lines = []
        # Line 1: Short answer
        if score is not None:
            ans_lines.append(f"Aapke career ke liye {score_to_natural(score)}")
        else:
            ans_lines.append("Aapke career ke liye prayas karne par unnati ke yog banenge.")
            
        # Line 2: Timing
        win_strs = []
        if windows:
            for w in windows:
                if "start" in w and "end" in w:
                    win_strs.append(format_window_natural(w["start"], w["end"]))
        if promo_windows:
            for w in promo_windows:
                if "start" in w and "end" in w:
                    win_strs.append(format_window_natural(w["start"], w["end"]))
                    
        if win_strs:
            ans_lines.append(f"Naukri me tarakki aur naye avsar {', '.join(win_strs)} ke dauran milne ke yog hain.")
            
        # Line 3: Simple explanation
        ans_lines.append("Kaam me mehnat aur lagan se aapko shubh parinaam prapt honge.")
        
        # Line 4: Practical guidance
        ans_lines.append("Apne koushal ko behtar banayein aur naye avsaron ke liye tayyar rahein.")
        
        # Line 5: Follow-up question
        ans_lines.append("Kya aap tarakki se jude kisi vishesh sawal ke baare me jaanna chahenge?")
        
        return {
            "answer": "\n".join(ans_lines[:5]),
            "confidence": "high",
            "sources_used": sources
        }
    elif category == "marriage":
        score = data.get("marriagePromiseScore")
        potential = data.get("marriagePotential")
        windows = data.get("marriageWindows")
        is_manglik = data.get("isManglik")
        severity = data.get("severity")
        
        sources = []
        if "marriagePromiseScore" in data: sources.append("marriagePromiseScore")
        if "marriagePotential" in data: sources.append("marriagePotential")
        if "marriageWindows" in data: sources.append("marriageWindows")
        if "isManglik" in data: sources.append("isManglik")
        if "severity" in data: sources.append("severity")
        
        ans_lines = []
        # Line 1: Short answer
        if score is not None:
            ans_lines.append(f"Aapke vivah ke liye {score_to_natural(score)}")
        else:
            ans_lines.append("Aapke vivah ke rishte ke liye yog ban rahe hain.")
            
        # Line 2: Timing
        win_strs = []
        if windows:
            for w in windows:
                if "start" in w and "end" in w:
                    win_strs.append(format_window_natural(w["start"], w["end"]))
        if win_strs:
            ans_lines.append(f"Vivah ke shubh yog {', '.join(win_strs)} ke dauran ban rahe hain.")
            
        # Line 3: Simple explanation
        if is_manglik:
            ans_lines.append(f"Kundli me manglik prabhav ({severity} severity) hone se milan par dhyan dena hoga.")
        else:
            ans_lines.append("Aapke rishton me aapsi samajh aur saubhagya bana rahega.")
            
        # Line 4: Practical guidance
        ans_lines.append("Parivar ke bado ka aashirvad lein aur rishton me dhyan aur aadar rakhein.")
        
        # Line 5: Follow-up question
        ans_lines.append("Kya aap vivah se jude kisi aur prashna ke baare me jaanna chahenge?")
        
        return {
            "answer": "\n".join(ans_lines[:5]),
            "confidence": "high",
            "sources_used": sources
        }
    else:
        name = data.get("name") or "Priya"
        return {
            "answer": get_generic_fallback(question, name),
            "confidence": "low",
            "sources_used": []
        }

@app.post("/pandit")
def interpret_astrology_data(request: PanditRequest):
    data = request.astrology_data
    question = request.question
    
    # Classify the user's question
    category = classify_question(question)
    
    # Check if astrology_data is empty/null
    if not data:
        return {
            "answer": get_generic_fallback(question, "Priya"),
            "confidence": "low",
            "sources_used": []
        }
        
    # Check for required keys ONLY if the category is career/marriage
    if category in ["career", "marriage"]:
        required_keys = [
            "lagna", "moonRashi", "careerScore", "careerPotential", "careerExplanation",
            "marriagePromiseScore", "marriagePotential", "marriageExplanation",
            "yogas", "isManglik", "severity"
        ]
        for k in required_keys:
            if k not in data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid or missing astrology engine data: '{k}' is required."
                )
            
    # Filter astrology_data based on classification
    filtered_data = {}
    if category == "career":
        career_keys = ["careerScore", "careerPotential", "careerExplanation", "careerWindows", "promotionWindows"]
        for k in career_keys:
            if k in data:
                filtered_data[k] = data[k]
    elif category == "marriage":
        marriage_keys = ["marriagePromiseScore", "marriagePotential", "marriageExplanation", "marriageWindows", "isManglik", "severity"]
        for k in marriage_keys:
            if k in data:
                filtered_data[k] = data[k]
                
    # Check what categories are allowed based on their presence in filtered_data
    allowed = check_allowed_categories(filtered_data)
    
    # Retrieve allowed dates from timing windows
    allowed_dates = extract_allowed_dates(filtered_data)
            
    # Try calling LLM if credentials exist in the environment
    import os
    import json
    import urllib.request
    import urllib.error
    
    api_key = os.environ.get("BEDROCK_API_KEY")
    base_url = os.environ.get("BEDROCK_BASE_URL")
    
    if api_key and base_url and category not in ["greeting", "unsupported"] and filtered_data:
        prompt = f"""You are "Pandit AI", an expert traditional Vedic Astrologer.
You are given a user question and a filtered structured astrology JSON:
User Question: "{question}"
Astrology Data: {json.dumps(filtered_data, indent=2)}

Your task is to answer ONLY the user question based on the provided astrology data.
Do not invent or calculate any astrology parameters or dates. Use ONLY the data provided.

ABSOLUTE RULES:
1. NEVER invent planet positions, houses, dasha, yogas, transits, timings, or remedies tied to planets. Only use information explicitly present in the provided Astrology Data.
2. NEVER generate dates on your own. Convert YYYY-MM timing windows in the data to natural language (e.g. "2026-11" -> "November 2026", "2026-11 to 2026-12" -> "November se December 2026 ke beech"). Do not mention dates otherwise.
3. NEVER use: score, promise score, confidence score, window, or technical terms. Convert scores to natural language (e.g., 75+ -> "Yog kaafi mazboot dikh rahe hain.", 60-74 -> "Achhi sambhavnayein dikh rahi hain.", 40-59 -> "Parinaam mehnat ke saath mil sakte hain.", below 40 -> "Thodi adhik satarkta aur prayas ki zarurat rahegi.").
4. Start directly with the answer. Never include greetings like "Namaste", "Hello", or repeat "${{name}} Beta" in the answer.
5. The answer must be structured as a maximum of 5 lines:
   Line 1: Short answer
   Line 2: Timing (only if timing data exists in the provided windows)
   Line 3: Simple explanation
   Line 4: Practical guidance
   Line 5: Relevant follow-up question
6. Never output "Data not available", score names, raw date formats (YYYY-MM), or technical astrology jargon not in the data.

You must output a JSON object matching this structure:
{{
  "answer": "...",
  "confidence": "low|medium|high",
  "sources_used": [...]
}}
Do not include any markdown wrappers or text outside the JSON. Return only the JSON.
"""

        models = [
            'deepseek.v3.2',
            'google.gemma-3-4b-it',
            'qwen.qwen3-32b-v1:0'
        ]
        
        for model in models:
            try:
                url = base_url.rstrip("/") + "/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                body = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(body).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_body = response.read().decode("utf-8")
                    res_json = json.loads(res_body)
                    content = res_json["choices"][0]["message"]["content"]
                    parsed_content = json.loads(content.strip())
                    
                    if all(k in parsed_content for k in ["answer", "confidence", "sources_used"]):
                        # Post-process verification/validation checks
                        violated = check_forbidden_terms(parsed_content["answer"], allowed)
                        dates_valid = check_dates_in_text(parsed_content["answer"], allowed_dates)
                        output_violated = check_forbidden_outputs(parsed_content["answer"])
                        
                        if not violated and dates_valid and not output_violated:
                            return parsed_content
                        else:
                            print(f"[Pandit AI] Model {model} output violated constraints. Violated terms: {violated}, Dates valid: {dates_valid}, Output violated: {output_violated}")
            except Exception as e:
                print(f"[Pandit AI] Model {model} failed: {e}")
                
    # Fallback: Deterministic rule-based template interpretation (100% compliant with rules, referencing engine data)
    return fallback_interpret(question, filtered_data, category)
