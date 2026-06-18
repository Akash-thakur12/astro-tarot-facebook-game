import { isFBInstant } from './fbinstant';

const updateLeaderboard = async (name, score) => {
  if (!isFBInstant()) return false;
  try {
    const leaderboard = await window.FBInstant.getLeaderboardAsync(name);
    await leaderboard.setScoreAsync(score);
    return true;
  } catch (error) {
    console.error(`Leaderboard ${name} update failed:`, error);
    return false;
  }
};

export const updateXPLeaderboard = (score) => updateLeaderboard('XP_LEADERBOARD', score);
export const updateCoinsLeaderboard = (score) => updateLeaderboard('COIN_LEADERBOARD', score);
export const updateStreakLeaderboard = (score) => updateLeaderboard('STREAK_LEADERBOARD', score);

export const getTopPlayers = async (name) => {
  if (!isFBInstant()) {
    return [
      { name: 'Arjun', score: 950, rank: 1, photo: null },
      { name: 'Priya', score: 820, rank: 2, photo: null },
      { name: 'Rahul', score: 710, rank: 3, photo: null }
    ];
  }
  try {
    const leaderboard = await window.FBInstant.getLeaderboardAsync(name);
    const entries = await leaderboard.getEntriesAsync(10, 0);
    return entries.map(entry => ({
      name: entry.getPlayer().getName(),
      photo: entry.getPlayer().getPhoto(),
      score: entry.getScore(),
      rank: entry.getRank()
    }));
  } catch (error) {
    console.error(`Get leaderboard ${name} failed:`, error);
    return [];
  }
};
