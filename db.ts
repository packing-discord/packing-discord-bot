import { Snowflake } from 'discord.js';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PG_USER!,
    database: process.env.PG_DATABASE!,
    password: process.env.PG_PASSWORD!,
    host: 'localhost',
    port: 5432
});

const getCurrentDay = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
}

export const startVoiceActivity = (userID: Snowflake, channelID: Snowflake) => {
    return pool.query(`
        INSERT INTO voice_activity
        (user_id, start_date, end_date, channel_id) VALUES
        ($1, $2, $3, $4);
    `, [userID, new Date().toISOString(), null, channelID]);
};

export const endVoiceActivity = (userID: Snowflake) => {
    return pool.query(`
        UPDATE voice_activity
        SET end_date = $1
        WHERE user_id = $2
        AND end_date is null;
    `, [new Date().toISOString(), userID]);
}

export const terminateVoiceActivities = async () => {
    const { rows } = await pool.query(`
        SELECT last_ping FROM public.bot_statistics;
    `);
    const lastPing = rows[0]?.last_ping;
    if (!lastPing) {
        return pool.query(`
            DELETE FROM voice_activity
            WHERE end_date is null;
        `);
    }
    return pool.query(`
        UPDATE voice_activity
        SET end_date = $1
        WHERE end_date is null;
    `, lastPing);
}

export const savePing = () => {
    return pool.query(`
        UPDATE public.bot_statistics
        SET last_ping = $1;
    `, [new Date().toISOString()]);
}

export const addMessage = async (userID: Snowflake, channelID: Snowflake) => {
    const { rows } = await pool.query(`
        SELECT * FROM message_activity
        WHERE user_id = $1
        AND date = $2;
    `, [userID, getCurrentDay()]);
    if (rows.length === 0) {
        await pool.query(`
            INSERT INTO message_activity
            (user_id, date, message_count, channels_ids) VALUES
            ($1, $2, $3, $4);
        `, [userID, getCurrentDay(), 1, [channelID]]);
    } else {
        const previousChannelsIDs = rows[0].channels_ids as Snowflake[];
        await pool.query(`
            UPDATE message_activity
            SET message_count = message_count + 1,
                channels_ids = $1
            WHERE user_id = $2
            AND date = $3;
        `, [previousChannelsIDs.includes(channelID) ? previousChannelsIDs : [...previousChannelsIDs, channelID], userID, getCurrentDay()]);
    }
}
