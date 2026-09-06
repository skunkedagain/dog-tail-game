import { handleLeaderboard } from '../server/leaderboard.js';

export const GET = (request:Request) => handleLeaderboard(request);
export const POST = (request:Request) => handleLeaderboard(request);
