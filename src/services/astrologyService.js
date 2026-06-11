import { mockKundaliData } from "../data/mockKundaliData";

/**
 * Astrology Service - Layer between UI and Astrology APIs
 */

// Simulated API latency
const DELAY = 2000;

/**
 * Generates a full Kundali report
 */
export const generateKundali = async (userData) => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, DELAY));
    
    // In the future, this will fetch from a real API
    // For now, returning mock data as a consistent structure
    return mockKundaliData;
  } catch (error) {
    console.error("Astrology Service Error (generate):", error);
    // Fallback to mock data on failure
    return mockKundaliData;
  }
};

/**
 * Fetches planetary positions for the chart
 */
export const getPlanetPositions = async (uid) => {
  try {
    await new Promise(resolve => setTimeout(resolve, DELAY));
    return mockKundaliData.planets;
  } catch (error) {
    console.error("Astrology Service Error (planets):", error);
    return mockKundaliData.planets;
  }
};

/**
 * Fetches future analysis (Career, Love, Health)
 */
export const getFutureAnalysis = async (uid) => {
  try {
    await new Promise(resolve => setTimeout(resolve, DELAY));
    return mockKundaliData.future;
  } catch (error) {
    console.error("Astrology Service Error (analysis):", error);
    return mockKundaliData.future;
  }
};

/**
 * Fetches astrological remedies
 */
export const getRemedies = async (uid) => {
  try {
    await new Promise(resolve => setTimeout(resolve, DELAY));
    return mockKundaliData.remedies;
  } catch (error) {
    console.error("Astrology Service Error (remedies):", error);
    return mockKundaliData.remedies;
  }
};
