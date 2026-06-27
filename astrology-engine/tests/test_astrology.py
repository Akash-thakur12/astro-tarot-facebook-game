import unittest
from datetime import datetime, timezone
import swisseph as swe
from pydantic import ValidationError

from main import BirthDetails
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
    determine_planet_house,
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

class TestAstrologyEngine(unittest.TestCase):
    
    def test_julian_day_conversion(self):
        """
        Verify Julian Day calculation against known values.
        """
        # Test Case: Jan 1, 1990 at 12:00:00 IST (+5.5) -> 06:30:00 UTC
        # Julian Day UT for 1990-01-01 06:30:00 is 2447892.770833
        jd, dt_utc = calculate_julian_day("1990-01-01", "12:00:00", 5.5)
        self.assertAlmostEqual(jd, 2447892.770833, places=5)
        self.assertEqual(dt_utc.year, 1990)
        self.assertEqual(dt_utc.month, 1)
        self.assertEqual(dt_utc.day, 1)
        self.assertEqual(dt_utc.hour, 6)
        self.assertEqual(dt_utc.minute, 30)
        self.assertEqual(dt_utc.second, 0)
        self.assertEqual(dt_utc.tzinfo, timezone.utc)

    def test_rashi_calculation(self):
        """
        Verify correct mapping of degrees to zodiac signs (Rashi).
        """
        self.assertEqual(get_rashi_name(0), "Aries")
        self.assertEqual(get_rashi_name(29.9), "Aries")
        self.assertEqual(get_rashi_name(30), "Taurus")
        self.assertEqual(get_rashi_name(117.93), "Cancer")
        self.assertEqual(get_rashi_name(359.9), "Pisces")

    def test_nakshatra_pada(self):
        """
        Verify Nakshatra and Pada calculation against known degrees.
        """
        # Test Case 1: Moon at 275.588 degrees (Indira Gandhi)
        # Should be Uttara Ashadha, Pada 3
        nak, idx, pada = get_nakshatra_details(275.588)
        self.assertEqual(nak, "Uttara Ashadha")
        self.assertEqual(idx, 20)
        self.assertEqual(pada, 3)

        # Test Case 2: Moon at 117.937 degrees (Mahatma Gandhi)
        # Should be Ashlesha, Pada 4
        nak, idx, pada = get_nakshatra_details(117.937)
        self.assertEqual(nak, "Ashlesha")
        self.assertEqual(idx, 8)
        self.assertEqual(pada, 4)

        # Test Case 3: Moon at 232.352 degrees (Albert Einstein)
        # Should be Jyeshtha, Pada 2
        nak, idx, pada = get_nakshatra_details(232.352)
        self.assertEqual(nak, "Jyeshtha")
        self.assertEqual(idx, 17)
        self.assertEqual(pada, 2)

    def test_chart_einstein(self):
        """
        Verify Albert Einstein's chart calculation.
        Born: March 14, 1879, 11:30 AM (LMT, +0.6658), Ulm, Germany.
        """
        jd, dt_birth = calculate_julian_day("1879-03-14", "11:30:00", 0.6658)
        positions = calculate_planetary_positions(jd)
        lagna = calculate_lagna(jd, 48.4011, 9.9876)

        # Verify Lagna (Gemini)
        self.assertEqual(get_rashi_name(lagna), "Gemini")
        self.assertAlmostEqual(lagna, 79.47, delta=1.0)

        # Verify Key Planets
        self.assertEqual(get_rashi_name(positions["sun"]), "Pisces")
        self.assertAlmostEqual(positions["sun"], 331.33, delta=1.0)

        self.assertEqual(get_rashi_name(positions["moon"]), "Scorpio")
        self.assertAlmostEqual(positions["moon"], 232.35, delta=1.0)

        self.assertEqual(get_rashi_name(positions["mars"]), "Capricorn")
        self.assertAlmostEqual(positions["mars"], 274.74, delta=1.0)

        # Verify Dasha at birth (Mercury-Moon)
        dasha = calculate_vimshottari_dasha(positions["moon"], dt_birth, dt_birth)
        self.assertEqual(dasha["currentMahadasha"], "Mercury")
        self.assertEqual(dasha["currentAntardasha"], "Moon")

    def test_chart_gandhi(self):
        """
        Verify Mahatma Gandhi's chart calculation.
        Born: October 2, 1869, 7:12 AM (LMT, +4.6420), Porbandar, India.
        """
        jd, dt_birth = calculate_julian_day("1869-10-02", "07:12:00", 4.6420)
        positions = calculate_planetary_positions(jd)
        lagna = calculate_lagna(jd, 21.6417, 69.6293)

        # Verify Lagna (Libra)
        self.assertEqual(get_rashi_name(lagna), "Libra")
        self.assertAlmostEqual(lagna, 184.61, delta=1.0)

        # Verify Key Planets
        self.assertEqual(get_rashi_name(positions["sun"]), "Virgo")
        self.assertAlmostEqual(positions["sun"], 166.89, delta=1.0)

        self.assertEqual(get_rashi_name(positions["moon"]), "Cancer")
        self.assertAlmostEqual(positions["moon"], 117.93, delta=1.0)

        # Verify Dasha at birth (Mercury-Saturn)
        dasha = calculate_vimshottari_dasha(positions["moon"], dt_birth, dt_birth)
        self.assertEqual(dasha["currentMahadasha"], "Mercury")
        self.assertEqual(dasha["currentAntardasha"], "Saturn")

    def test_chart_indira(self):
        """
        Verify Indira Gandhi's chart calculation.
        Born: November 19, 1917, 11:11 PM (IST, +5.5), Allahabad, India.
        """
        jd, dt_birth = calculate_julian_day("1917-11-19", "23:11:00", 5.5)
        positions = calculate_planetary_positions(jd)
        lagna = calculate_lagna(jd, 25.4358, 81.8463)

        # Verify Lagna (Cancer)
        self.assertEqual(get_rashi_name(lagna), "Cancer")
        self.assertAlmostEqual(lagna, 117.36, delta=1.0)

        # Verify Key Planets
        self.assertEqual(get_rashi_name(positions["sun"]), "Scorpio")
        self.assertAlmostEqual(positions["sun"], 214.12, delta=1.0)

        self.assertEqual(get_rashi_name(positions["moon"]), "Capricorn")
        self.assertAlmostEqual(positions["moon"], 275.58, delta=1.0)

        # Verify Dasha at birth (Sun-Mercury)
        dasha = calculate_vimshottari_dasha(positions["moon"], dt_birth, dt_birth)
        self.assertEqual(dasha["currentMahadasha"], "Sun")
        self.assertEqual(dasha["currentAntardasha"], "Mercury")

    def test_validation_errors(self):
        """
        Verify that BirthDetails Pydantic validation catches invalid inputs.
        """
        # Test Case 1: Invalid date format
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990/01/01", time="12:00:00", latitude=12.9716, longitude=77.5946, timezone=5.5)

        # Test Case 2: Invalid calendar date (Feb 30)
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990-02-30", time="12:00:00", latitude=12.9716, longitude=77.5946, timezone=5.5)

        # Test Case 3: Invalid time format
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990-01-01", time="25:00:00", latitude=12.9716, longitude=77.5946, timezone=5.5)

        # Test Case 4: Latitude out of range
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990-01-01", time="12:00:00", latitude=95.0, longitude=77.5946, timezone=5.5)

        # Test Case 5: Longitude out of range
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990-01-01", time="12:00:00", latitude=12.9716, longitude=-185.0, timezone=5.5)

        # Test Case 6: Timezone offset out of range
        with self.assertRaises(ValidationError):
            BirthDetails(date="1990-01-01", time="12:00:00", latitude=12.9716, longitude=77.5946, timezone=15.0)

    def test_extreme_latitudes(self):
        """
        Verify that Lagna calculation handles extreme and polar latitudes without crashing.
        """
        # Test Case 1: High northern latitude (80.0 N)
        jd, _ = calculate_julian_day("2026-06-27", "12:00:00", 5.5)
        try:
            lagna = calculate_lagna(jd, 80.0, 77.0)
            self.assertTrue(0.0 <= lagna < 360.0)
        except Exception as e:
            self.fail(f"calculate_lagna crashed at 80.0 N with: {e}")

        # Test Case 2: Exact North Pole (90.0 N)
        try:
            lagna = calculate_lagna(jd, 90.0, 77.0)
            self.assertTrue(0.0 <= lagna < 360.0)
        except Exception as e:
            self.fail(f"calculate_lagna crashed at 90.0 N with: {e}")

    def test_bhava_calculations(self):
        """
        Verify Bhava Chart, planet placements, Drishti aspects, and Manglik detection.
        """
        # Test Case 1: Cusp placement wrapping around 360 degrees
        cusps = [350.0, 20.0, 50.0, 80.0, 110.0, 140.0, 170.0, 200.0, 230.0, 260.0, 290.0, 320.0]
        
        # Planet inside first house (from 350.0 to 20.0)
        self.assertEqual(determine_planet_house(355.0, cusps), 1)
        self.assertEqual(determine_planet_house(10.0, cusps), 1)
        
        # Planet inside third house (from 50.0 to 80.0)
        self.assertEqual(determine_planet_house(65.0, cusps), 3)
        
        # Planet inside 12th house (from 320.0 to 350.0)
        self.assertEqual(determine_planet_house(330.0, cusps), 12)

        # Test Case 2: Drishti Aspects
        # Mars in House 10 should aspect 1, 4, 5 (4th, 7th, 8th from 10)
        # Jupiter in House 2 should aspect 6, 8, 10 (5th, 7th, 9th from 2)
        # Saturn in House 6 should aspect 8, 12, 3 (3rd, 7th, 10th from 6)
        placements = {
            "marsHouse": 10,
            "jupiterHouse": 2,
            "saturnHouse": 6
        }
        aspects = calculate_drishti_aspects(placements)
        self.assertEqual(aspects["marsAspects"], [1, 4, 5])
        self.assertEqual(aspects["jupiterAspects"], [6, 8, 10])
        self.assertEqual(aspects["saturnAspects"], [3, 8, 12])

        # Test Case 3: Manglik Detection
        # Mars in House 8, Moon in House 1, Venus in House 1
        # => Manglik from Lagna (Mars in 8), Moon (Mars in 8), and Venus (Mars in 8) -> High severity
        placements_manglik_high = {
            "marsHouse": 8,
            "moonHouse": 1,
            "venusHouse": 1
        }
        res_high = detect_manglik_dosha(placements_manglik_high)
        self.assertTrue(res_high["isManglik"])
        self.assertEqual(res_high["severity"], "high")
        self.assertEqual(len(res_high["reasons"]), 3)

        # Mars in House 3, Moon in House 1, Venus in House 1
        # => Relative to Moon: (3 - 1) % 12 + 1 = 3 (non-manglik)
        # => Relative to Venus: (3 - 1) % 12 + 1 = 3 (non-manglik)
        # => Relative to Lagna: House 3 (non-manglik)
        # => Not Manglik
        placements_non_manglik = {
            "marsHouse": 3,
            "moonHouse": 1,
            "venusHouse": 1
        }
        res_none = detect_manglik_dosha(placements_non_manglik)
        self.assertFalse(res_none["isManglik"])
        self.assertEqual(res_none["severity"], "none")
        self.assertEqual(len(res_none["reasons"]), 0)

    def test_navamsa_and_yogas(self):
        """
        Verify Navamsa (D9) calculation and Yog Detection Engine.
        """
        # Test Case 1: Navamsa (D9)
        # 0.0 -> Aries, 3.4 -> Taurus, 30.0 -> Capricorn, 60.0 -> Libra, 90.0 -> Cancer
        self.assertEqual(get_navamsa_rashi(0.0), "Aries")
        self.assertEqual(get_navamsa_rashi(3.4), "Taurus")
        self.assertEqual(get_navamsa_rashi(30.0), "Capricorn")
        self.assertEqual(get_navamsa_rashi(60.0), "Libra")
        self.assertEqual(get_navamsa_rashi(90.0), "Cancer")

        # Test Case 2: Gaj Kesari Yog (Jupiter in Kendra from Moon)
        # Moon in House 1, Jupiter in House 4 (Cancer - exalted) -> Gaj Kesari Yog (strong)
        positions = {
            "sun": 0.0, "moon": 12.0, "mars": 40.0, "mercury": 150.0,
            "jupiter": 95.0, "venus": 200.0, "saturn": 280.0, "rahu": 50.0, "ketu": 230.0
        }
        placements = {
            "sunHouse": 1, "moonHouse": 1, "marsHouse": 2, "mercuryHouse": 6,
            "jupiterHouse": 4, "venusHouse": 8, "saturnHouse": 10, "rahuHouse": 3, "ketuHouse": 9
        }
        bhava_chart = {
            "house1": "Aries", "house2": "Taurus", "house3": "Gemini", "house4": "Cancer",
            "house5": "Leo", "house6": "Virgo", "house7": "Libra", "house8": "Scorpio",
            "house9": "Sagittarius", "house10": "Capricorn", "house11": "Aquarius", "house12": "Pisces"
        }
        yogas = detect_yogas(positions, placements, bhava_chart)
        yog_names = [y["name"] for y in yogas]
        
        self.assertIn("Gaj Kesari Yog", yog_names)
        
        # Test Case 3: Budhaditya Yog (Sun and Mercury conjunct in Leo)
        positions_conjunction = {
            "sun": 125.0, "moon": 12.0, "mars": 40.0, "mercury": 128.0,
            "jupiter": 210.0, "venus": 200.0, "saturn": 280.0, "rahu": 50.0, "ketu": 230.0
        }
        yogas_conjunction = detect_yogas(positions_conjunction, placements, bhava_chart)
        self.assertIn("Budhaditya Yog", [y["name"] for y in yogas_conjunction])

    def test_transit_calculations(self):
        """
        Verify Real-time Transit calculation, Sade Sati phases, and Dhaiya detection.
        """
        # Test Case 1: Natal Moon in Aquarius, Saturn transiting Aquarius
        # => Relative position = 1 -> Sade Sati Phase 2 (Second)
        res1 = calculate_transits(
            lagna_rashi="Pisces",
            natal_moon_rashi="Aquarius",
            target_dt=datetime(2024, 6, 1, 12, 0, 0) # Saturn was in Aquarius in mid-2024
        )
        self.assertTrue(res1["isSadeSati"])
        self.assertEqual(res1["phase"], "Second")
        self.assertFalse(res1["isDhaiya"])

        # Test Case 2: Natal Moon in Aquarius, Saturn transiting Pisces
        # => Relative position = 2 -> Sade Sati Phase 3 (Third)
        res2 = calculate_transits(
            lagna_rashi="Pisces",
            natal_moon_rashi="Aquarius",
            target_dt=datetime(2026, 6, 27, 12, 0, 0) # Saturn is in Pisces in 2026
        )
        self.assertTrue(res2["isSadeSati"])
        self.assertEqual(res2["phase"], "Third")
        self.assertFalse(res2["isDhaiya"])

        # Test Case 3: Natal Moon in Taurus, Saturn transiting Leo
        # => Relative position = 4 -> Dhaiya (Kantak Shani)
        res3 = calculate_transits(
            lagna_rashi="Aries",
            natal_moon_rashi="Taurus",
            target_dt=datetime(2008, 6, 1, 12, 0, 0) # Saturn was in Leo in 2008
        )
        self.assertFalse(res3["isSadeSati"])
        self.assertTrue(res3["isDhaiya"])
        self.assertEqual(res3["type"], "Kantak Shani")

        # Test Case 4: Natal Moon in Taurus, Saturn transiting Sagittarius
        # => Relative position = 8 -> Dhaiya (Ashtam Shani)
        res4 = calculate_transits(
            lagna_rashi="Aries",
            natal_moon_rashi="Taurus",
            target_dt=datetime(2018, 6, 1, 12, 0, 0) # Saturn was in Sagittarius in 2018
        )
        self.assertFalse(res4["isSadeSati"])
        self.assertTrue(res4["isDhaiya"])
        self.assertEqual(res4["type"], "Ashtam Shani")

    def test_marriage_calculations(self):
        """
        Verify Marriage Promise Score, Potential, and Timing Windows.
        """
        # Test Case 1: Marriage Promise Score
        positions = {
            "sun": 0.0, "moon": 12.0, "mars": 40.0, "mercury": 150.0,
            "jupiter": 95.0, "venus": 200.0, "saturn": 280.0, "rahu": 50.0, "ketu": 230.0
        }
        placements = {
            "sunHouse": 1, "moonHouse": 1, "marsHouse": 2, "mercuryHouse": 6,
            "jupiterHouse": 4, "venusHouse": 8, "saturnHouse": 10, "rahuHouse": 3, "ketuHouse": 9
        }
        bhava_chart = {
            "house1": "Aries", "house2": "Taurus", "house3": "Gemini", "house4": "Cancer",
            "house5": "Leo", "house6": "Virgo", "house7": "Libra", "house8": "Scorpio",
            "house9": "Sagittarius", "house10": "Capricorn", "house11": "Aquarius", "house12": "Pisces"
        }
        navamsa = {
            "venusNavamsa": "Taurus",
            "marsNavamsa": "Scorpio",
            "lagnaNavamsa": "Aries"
        }
        manglik = {
            "isManglik": False,
            "severity": "none"
        }
        
        promise_score, potential, explanation = calculate_marriage_promise(
            positions, placements, bhava_chart, navamsa, manglik
        )
        
        self.assertTrue(0 <= promise_score <= 100)
        self.assertIn(potential, ["High", "Medium", "Low"])
        self.assertIn("7thHouseStrength", explanation)
        self.assertIn("venusStrength", explanation)

        # Test Case 2: Marriage Timing Windows (non-empty windows checking)
        windows = calculate_marriage_timing_windows(
            moon_longitude=12.0,
            birth_datetime_utc=datetime(1990, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            lagna_rashi="Aries",
            natal_moon_rashi="Aries",
            bhava_chart=bhava_chart,
            placements=placements,
            current_time_utc=datetime(2026, 6, 27, 12, 0, 0, tzinfo=timezone.utc)
        )
        self.assertIsInstance(windows, list)

    def test_career_calculations(self):
        """
        Verify Career Promise Score, Potential, and Timing/Promotion Windows.
        """
        # Test Case 1: Career Promise Score
        positions = {
            "sun": 0.0, "moon": 12.0, "mars": 40.0, "mercury": 150.0,
            "jupiter": 95.0, "venus": 200.0, "saturn": 280.0, "rahu": 50.0, "ketu": 230.0
        }
        placements = {
            "sunHouse": 1, "moonHouse": 1, "marsHouse": 2, "mercuryHouse": 6,
            "jupiterHouse": 4, "venusHouse": 8, "saturnHouse": 10, "rahuHouse": 3, "ketuHouse": 9
        }
        bhava_chart = {
            "house1": "Aries", "house2": "Taurus", "house3": "Gemini", "house4": "Cancer",
            "house5": "Leo", "house6": "Virgo", "house7": "Libra", "house8": "Scorpio",
            "house9": "Sagittarius", "house10": "Capricorn", "house11": "Aquarius", "house12": "Pisces"
        }
        yogas = [
            {"name": "Raj Yog", "strength": "strong", "reason": "test"},
            {"name": "Dharma Karmadhipati Yog", "strength": "strong", "reason": "test"}
        ]
        
        promise_score, potential, explanation = calculate_career_promise(
            positions, placements, bhava_chart, yogas
        )
        
        self.assertTrue(0 <= promise_score <= 100)
        self.assertIn(potential, ["High", "Medium", "Low"])
        self.assertIn("10thHouseStrength", explanation)
        self.assertIn("saturnStrength", explanation)

        # Test Case 2: Career Timing Windows (non-empty windows checking)
        c_windows, p_windows = calculate_career_timing_windows(
            moon_longitude=12.0,
            birth_datetime_utc=datetime(1990, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            lagna_rashi="Aries",
            bhava_chart=bhava_chart,
            placements=placements,
            current_time_utc=datetime(2026, 6, 27, 12, 0, 0, tzinfo=timezone.utc)
        )
        self.assertIsInstance(c_windows, list)
        self.assertIsInstance(p_windows, list)

    def test_pandit_ai_endpoint(self):
        """
        Verify Pandit AI validation and response schema.
        """
        from main import (
            interpret_astrology_data,
            PanditRequest,
            classify_question,
            check_allowed_categories,
            extract_allowed_dates,
            check_forbidden_terms,
            check_dates_in_text
        )
        from fastapi import HTTPException
        
        # Test Case 1: Missing required keys (Should raise HTTPException with status 400)
        invalid_payload = {
            "lagna": "Aries"
        }
        with self.assertRaises(HTTPException) as context:
            interpret_astrology_data(PanditRequest(question="job", astrology_data=invalid_payload))
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Invalid or missing astrology engine data", context.exception.detail)

        # Base valid payload
        valid_payload = {
            "lagna": "Aries",
            "moonRashi": "Taurus",
            "careerScore": 84,
            "careerPotential": "High",
            "careerExplanation": {},
            "careerWindows": [{"start": "2026-08", "end": "2026-12", "confidence": "high", "reason": "good transit"}],
            "promotionWindows": [],
            "marriagePromiseScore": 78,
            "marriagePotential": "High",
            "marriageExplanation": {},
            "marriageWindows": [{"start": "2027-02", "end": "2027-06"}],
            "yogas": [{"name": "Gaj Kesari Yog"}],
            "isManglik": False,
            "severity": "none"
        }
        
        # Test Case 2: Career Query
        req_career = PanditRequest(question="when will I get a job?", astrology_data=valid_payload)
        res_career = interpret_astrology_data(req_career)
        self.assertIn("answer", res_career)
        self.assertIn("confidence", res_career)
        self.assertIn("sources_used", res_career)
        self.assertEqual(res_career["confidence"], "high")
        self.assertIn("careerScore", res_career["sources_used"])
        # Should not mention planets, dasha, houses, yogas (none exist in filtered career fields)
        ans_lower = res_career["answer"].lower()
        self.assertNotIn("jupiter", ans_lower)
        self.assertNotIn("mars", ans_lower)
        self.assertNotIn("dasha", ans_lower)
        self.assertNotIn("house", ans_lower)
        self.assertNotIn("yoga", ans_lower)
        
        # Test Case 3: Marriage Query
        req_marriage = PanditRequest(question="marriage timing details", astrology_data=valid_payload)
        res_marriage = interpret_astrology_data(req_marriage)
        self.assertIn("answer", res_marriage)
        self.assertEqual(res_marriage["confidence"], "high")
        self.assertIn("marriagePromiseScore", res_marriage["sources_used"])
        
        # Test Case 4: Greeting Query
        req_greeting = PanditRequest(question="Namaste ji", astrology_data=valid_payload)
        res_greeting = interpret_astrology_data(req_greeting)
        self.assertIn("answer", res_greeting)
        self.assertIn("namaste", res_greeting["answer"].lower())
        
        # Test Case 5: Unsupported Query
        req_unsupported = PanditRequest(question="how is my health?", astrology_data=valid_payload)
        res_unsupported = interpret_astrology_data(req_unsupported)
        expected_unsupported = "Priya Beta, is vishay ki poori jankari ke liye vistaar se kundli vishleshan chahiye aur iska astrology data mere paas uplabdh nahi hai.\n\nFilhal samanya vichar ke anusar Swayam par dhyan dein aur achhi jeevan shaili apnayein.\n\nUpay: Roz subah Hanuman Chalisa ka paath karein.\n\nKya aap career ya vivah ke baare me jaanna chahenge? Uske liye anukool yog ki ganana uplabdh hai."
        self.assertEqual(res_unsupported["answer"], expected_unsupported)
        
        # Test Case 6: Classification Helper
        self.assertEqual(classify_question("hi panditji"), "greeting")
        self.assertEqual(classify_question("Job kab milegi"), "career")
        self.assertEqual(classify_question("shaadi kab hogi?"), "marriage")
        self.assertEqual(classify_question("what is my lucky color?"), "unsupported")
        
        # Test Case 7: Allowed categories helper
        allowed = check_allowed_categories({"careerScore": 80, "careerWindows": [{"start": "2026-08", "reason": "transit of Jupiter"}]})
        self.assertTrue(allowed["planets"]) # Jupiter is a planet
        self.assertFalse(allowed["dasha"])
        
        # Test Case 8: Dates constraint validation helper
        allowed_dates = extract_allowed_dates({"careerWindows": [{"start": "2026-08", "end": "2026-10"}]})
        self.assertTrue(check_dates_in_text("Your window is in August 2026", allowed_dates))
        self.assertFalse(check_dates_in_text("Your window is in December 2026", allowed_dates)) # December not allowed
        
        # Test Case 9: Forbidden terms validator
        allowed_cats = {"planets": False, "dasha": False, "houses": False, "yogas": False}
        violated = check_forbidden_terms("The sun rises", allowed_cats)
        self.assertIn("planet:sun", violated)
        
        violated_clean = check_forbidden_terms("This is a good time.", allowed_cats)
        self.assertEqual(violated_clean, [])

if __name__ == "__main__":
    unittest.main()
