# Rashi (Zodiac Signs) Names in order (30 degrees each)
RASHI_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# 27 Nakshatras in order (13.33333 degrees each)
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Vimshottari Dasha Lord Cycle
DASHA_CYCLE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

# Vimshottari Dasha Period Durations (in years)
DASHA_PERIODS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17
}

# Number of days in a year for Dasha calculations (Solar year)
DAYS_PER_YEAR = 365.2425

# Drishti configurations (relative aspects from planet house)
# All planets aspect the 7th house. Mars, Jupiter, Saturn, and Rahu/Ketu have special aspects.
PLANET_ASPECT_RULES = {
    "sun": [7],
    "moon": [7],
    "mars": [4, 7, 8],
    "mercury": [7],
    "jupiter": [5, 7, 9],
    "venus": [7],
    "saturn": [3, 7, 10],
    "rahu": [5, 7, 9],  # Configurable aspects for Rahu
    "ketu": [5, 7, 9]   # Configurable aspects for Ketu
}

# Manglik Dosha Configuration
MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12]  # Houses where Mars placement causes Manglik Dosha
MANGLIK_REFERENCES = ["lagna", "moon", "venus"]  # Reference points to verify Mars relative house placement

