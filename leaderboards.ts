import { Client, User } from 'discord.js';
import { fetchMessageActivityLeaderboard, fetchVoiceActivityLeaderboard } from './db';
import humanizeDuration from 'humanize-duration';

interface VoiceActivityLeaderboardEntry {
    user: User;
    time: string;
}

interface MessageActivityLeaderboardEntry {
    user: User;
    count: number;
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
