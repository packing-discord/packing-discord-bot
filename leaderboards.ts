import { Client, User } from 'discord.js';
import { fetchVoiceActivityLeaderboard } from './db';
import humanizeDuration from 'humanize-duration';

interface VoiceActivityLeaderboardEntry {
    user: User;
    time: string;
}

const formatInterval = (t: number) => {
    return (t/86400)+'d '+(new Date(t%86400*1000)).toUTCString().replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, "$1h $2m $3s");
}

export const formatVoiceActivityLeaderboard = async (client: Client): Promise<VoiceActivityLeaderboardEntry[]> => {
    /* Voice activity leaderboard */
    const voiceLeaderboard = await fetchVoiceActivityLeaderboard();
    const voiceLeaderboardEntries: VoiceActivityLeaderboardEntry[] = [];
    await Promise.all(voiceLeaderboard.map((entry) => {
        console.log(entry)
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
};