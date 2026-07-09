import { describe, it, expect } from 'vitest';
import { validateResponse, rewriteResponse } from '../lib/responseValidator.js';

describe('Hard Enforcement Mode Validator Tests', () => {
  describe('Language Lock Checks', () => {
    it('should pass on correct language matching (Hindi query -> Devanagari Hindi response)', () => {
      const query = "Meri shadi kab hogi?";
      const response = "आपकी कुंडली में विवाह का योग सुंदर बन रहा है।";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(true);
      expect(result.violations).not.toContain("LANGUAGE_MISMATCH");
    });

    it('should fail when Hindi query gets English response (HIGH severity)', () => {
      const query = "Meri shadi kab hogi?";
      const response = "Your marriage will happen in the near future.";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("LANGUAGE_MISMATCH");
      expect(result.score).toBeLessThan(90);
    });

    it('should fail when English query gets Hindi response (HIGH severity)', () => {
      const query = "When will I get a job?";
      const response = "आपको जल्द ही नौकरी मिलेगी।";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("LANGUAGE_MISMATCH");
      expect(result.score).toBeLessThan(90);
    });

    it('should fail when response uses banned Latin-script Hinglish words (HIGH severity)', () => {
      const query = "Naukri kab milegi?";
      const response = "आपको shadi और naukri का सुख मिलेगा।"; // Contains Latin Hinglish words
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("LANGUAGE_MISMATCH");
    });
  });

  describe('Timing Safety Checks', () => {
    it('should pass on qualitative timing expressions', () => {
      const query = "Job kab lagegi?";
      const response = "निकट भविष्य में आपको शुभ समाचार मिल सकता है।";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(true);
      expect(result.violations).not.toContain("UNSUPPORTED_TIMING");
    });

    it('should fail on exact numbers/timings without astro/dasha context (HIGH severity)', () => {
      const query = "Job kab lagegi?";
      const response = "आपको 45 दिनों में नई नौकरी मिलेगी।"; // No dasha context
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("UNSUPPORTED_TIMING");
    });

    it('should pass on exact timings when dasha/astro context is present', () => {
      const query = "Job kab lagegi?";
      const response = "आपकी कुंडली में राहु की महादशा के अंतर्गत 45 दिनों में शुभ योग बन रहा है।"; // Has astro context
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(true);
      expect(result.violations).not.toContain("UNSUPPORTED_TIMING");
    });
  });

  describe('Assumption Killer Checks', () => {
    it('should fail when inventing specific jobs without evidence/explicit query (HIGH severity)', () => {
      const query = "Mujhe kaunsi category pasand hai?";
      const response = "आपके लिए Software Engineer की नौकरी सबसे बेहतर रहेगी।";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("ASSUMPTION");
    });

    it('should pass when career is explicitly asked or supported by query/profile', () => {
      const query = "Which job is best for me?"; // User directly asks for options in English, recommending options in English is allowed
      const response = "1. Software Engineer\n- stable career";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(true);
    });

    it('should fail when using absolute assertions without profile evidence (HIGH severity)', () => {
      const query = "Kaunsi job karu?";
      const response = "यही आपके लिए परफेक्ट है।"; // Absolute assertion
      const result = validateResponse(response, query, [], {}); // Empty profile memory
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("ASSUMPTION");
    });
  });

  describe('Topic Drift Checks', () => {
    it('should fail when career query drifts into marriage topics (MEDIUM severity)', () => {
      const query = "Career me promotion kab hoga?";
      const response = "करियर में पदोन्नति का योग है। वैसे आपकी शादी का समय भी निकट आ रहा है।";
      const result = validateResponse(response, query);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("TOPIC_DRIFT");
    });
  });

  describe('Follow-up Governor Checks', () => {
    it('should fail when ending with a question when last 2 messages also had questions (MEDIUM severity)', () => {
      const query = "Naukri kab milegi?";
      const response = "जल्द ही योग बन रहे हैं। क्या आप तैयार हैं?";
      const history = [
        { role: 'model', content: "क्या आपका जन्म दिन सही है?" },
        { role: 'user', content: "हाँ सही है" },
        { role: 'model', content: "क्या आप शादीशुदा हैं?" },
        { role: 'user', content: "नहीं" }
      ];
      const result = validateResponse(response, query, history);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("FOLLOWUP_SPAM");
    });
  });

  describe('Rewriting Functionality', () => {
    it('should rewrite response to strip out follow-up questions', () => {
      const response = "जल्द ही योग बन रहे हैं। क्या आप तैयार हैं?";
      const rewritten = rewriteResponse(response, ["FOLLOWUP_SPAM"]);
      expect(rewritten).toBe("जल्द ही योग बन रहे हैं।");
    });
  });
});
