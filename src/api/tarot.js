/**
 * Tarot API integration for fetching card data from tarotapi.dev
 */

const API_BASE_URL = 'https://tarotapi.dev/api/v1';

/**
 * Fetches a random tarot card from the external API.
 * Returns an object containing the name, upright meaning, reversed meaning, and description.
 * 
 * @returns {Promise<Object>} The card data object
 * @throws {Error} If the fetch fails or data is invalid
 */
export const getDailyTarotCard = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/random`);
    
    if (!response.ok) {
      throw new Error(`Tarot API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.cards || data.cards.length === 0) {
      throw new Error('No card data received from Tarot API');
    }

    const card = data.cards[0];

    // Return the specific fields requested
    return {
      name: card.name,
      meaning_up: card.meaning_up,
      meaning_rev: card.meaning_rev,
      desc: card.desc
    };
  } catch (error) {
    console.error('Error fetching tarot card:', error);
    throw error;
  }
};
