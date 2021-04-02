import { Client, User } from 'discord.js';
import { fetchMessageActivityLeaderboard, fetchScoreLeaderboard, fetchVoiceActivityLeaderboard } from './db';
import humanizeDuration from 'humanize-duration';

interface VoiceActivityLeaderboardEntry {
    user: User;
    time: string;
}

interface MessageActivityLeaderboardEntry {
    user: User;
    count: number;
}

interface ScoreLeaderboardEntry {
    user: User;
    total: number;
    wins: number;
    losses: number;
}

export const formatVoiceActivityLeaderboard = async (client: Client): Promise<VoiceActivityLeaderboardEntry[]> => {
    const voiceLeaderboard = await fetchVoiceActivityLeaderboard();
    const voiceLeaderboardEntries: VoiceActivityLeaderboardEntry[] = [];
    await Promise.all(voiceLeaderboard.map((entry) => {
        return new Promise<void>(async (resolve) => {
            const user = client.users.cache.get(entry.user_id) || await client.users.fetch(entry.user_id).catch(() => {});
            if (!user) resolve();
            voiceLeaderboardEntries.push({
                user: user as User,
                time: humanizeDuration(
                    (entry.total_time.seconds || 0) * 1000
                    + (entry.total_time.minutes || 0) * 1000 * 60
                    + (entry.total_time.hours || 0) * 1000 * 60 * 60
                    + (entry.total_time.days || 0) * 1000 * 60 * 60 * 24
                )
            });
            resolve();
        });
    }));
    return voiceLeaderboardEntries;
}

export const formatMessageActivityLeaderboard = async (client: Client): Promise<MessageActivityLeaderboardEntry[]> => {
    const messageLeaderboard = await fetchMessageActivityLeaderboard();
    const messageLeaderboardEntries: MessageActivityLeaderboardEntry[] = [];
    await Promise.all(messageLeaderboard.map((entry) => {
        return new Promise<void>(async (resolve) => {
            const user = client.users.cache.get(entry.user_id) || await client.users.fetch(entry.user_id).catch(() => {});
            if (!user) resolve();
            messageLeaderboardEntries.push({
                user: user as User,
                count: entry.total_sent
            });
            resolve();
        });
    }));
    return messageLeaderboardEntries;
}

export const formatScoreLeaderboard = async (client: Client): Promise<ScoreLeaderboardEntry[]> => {
    const scoreLeaderboard = await fetchScoreLeaderboard();
    const scoreLeaderboardEntries: ScoreLeaderboardEntry[] = [];
    await Promise.all(scoreLeaderboard.map((entry) => {
        return new Promise<void>(async (resolve) => {
            const user = client.users.cache.get(entry.user_id) || await client.users.fetch(entry.user_id).catch(() => {});
            if (!user) resolve();
            scoreLeaderboardEntries.push({
                user: user as User,
                total: entry.total,
                losses: entry.losses,
                wins: entry.wins
            });
            resolve();
        });
    }));
    return scoreLeaderboardEntries; 
}
