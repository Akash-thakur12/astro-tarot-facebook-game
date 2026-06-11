import { mockKundaliData } from "../data/mockKundaliData";

/**
 * Astrology Service - Layer between UI and Astrology APIs
 */

/**
 * Generates a full Kundali report via secure Vercel Serverless Function
 */
export const generateKundali = async (userData) => {
  try {
    const response = await fetch('/api/kundali', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Astrology Service Error (Prokerala):", error.message);
    console.log("Falling back to mock data...");
    
    // Simulate slight delay even for fallback to keep UX consistent
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockKundaliData;
  }
};

/**
 * Fetches planetary positions for the chart
 * (Note: Now mostly handled by the unified generateKundali call)
 */
export const getPlanetPositions = async (uid) => {
  return mockKundaliData.planets;
};

/**
 * Fetches future analysis (Career, Love, Health)
 */
export const getFutureAnalysis = async (uid) => {
  return mockKundaliData.future;
};

/**
 * Fetches astrological remedies
 */
export const getRemedies = async (uid) => {
  return mockKundaliData.remedies;
};
