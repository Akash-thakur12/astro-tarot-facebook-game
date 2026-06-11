import { mockKundaliData } from "../data/mockKundaliData";

/**
 * Astrology Service - Layer between UI and Astrology APIs
 */

/**
 * Generates a full Kundali report
 * Note: Real API integration is marked as 'Coming Soon'.
 * Returning mock AI-generated predictions directly.
 */
export const generateKundali = async (userData) => {
  // Simulate slight delay for AI calculation feel
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    ...mockKundaliData,
    name: userData.fullName || mockKundaliData.name
  };
};

/**
 * Fetches planetary positions for the chart
 */
export const getPlanetPositions = async (uid) => {
  return mockKundaliData.planets;
};

/**
 * Fetches future analysis (Career, Love, Health, Finance)
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
