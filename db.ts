/**
CREATE FUNCTION validate_expenditures_func()
  RETURNS trigger AS
$func$
BEGIN
   IF (SELECT (CASE WHEN sum(nb_points) is null THEN 0 ELSE sum(nb_points) END + NEW.nb_points) FROM points_expenditures WHERE user_id = NEW.user_id)
    > (SELECT (CASE WHEN sum(CASE WHEN event_type = 'win' THEN 1 ELSE 0 END) is null THEN 0 ELSE sum(CASE WHEN event_type = 'win' THEN 1 ELSE 0 END) END) FROM users_scores_events WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'too many points spent';
   ELSE
   	  RAISE NOTICE '% points for % wins spent', (SELECT (CASE WHEN sum(nb_points) is null THEN 0 ELSE sum(nb_points) END + NEW.nb_points) FROM points_expenditures WHERE user_id = NEW.user_id), (SELECT sum(CASE WHEN event_type = 'win' THEN 1 ELSE 0 END) FROM users_scores_events WHERE user_id = NEW.user_id);
   END IF;
   RETURN NEW;
END
$func$ LANGUAGE plpgsql;

CREATE TRIGGER validate_expenditures_trigg
BEFORE INSERT ON points_expenditures
FOR EACH ROW EXECUTE PROCEDURE validate_expenditures_func();
*/

import { Snowflake } from 'discord.js';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PG_USER!,
    database: process.env.PG_DATABASE!,
    password: process.env.PG_PASSWORD!,
    host: 'localhost',
    port: 5432
});

type ScoreEventType = 'win' | 'loss';

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
        SELECT last_ping FROM bot_statistics;
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
        UPDATE bot_statistics
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

export const addScoreEvent = async (userID: Snowflake, modUserID: Snowflake, eventDate: Date, eventType: ScoreEventType): Promise<void> => {
    await pool.query(`
        INSERT INTO users_scores_events
        (user_id, mod_user_id, event_date, event_type) VALUES
        ($1, $2, $3, $4);
    `, [userID, modUserID, eventDate.toISOString(), eventType]);
}

export const fetchUserScoreEvents = (userID: Snowflake): Promise<unknown[]> => {
    return pool.query(`
        SELECT * FROM users_scores_events WHERE user_id = $1;
    `, [userID]).then(({ rows }) => rows);
}

export const fetchVoiceActivityLeaderboard = (count: number = 10) => {
    return pool.query(`
        SELECT user_id, SUM ((CASE WHEN end_date IS null THEN now() ELSE end_date END) - start_date) as total_time
        FROM voice_activity
        WHERE start_date > current_date - interval '7 days' OR end_date is null
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT $1;
    `, [count]).then(({ rows }) => rows);
}

export const fetchMessageActivityLeaderboard = (count: number = 10) => {
    return pool.query(`
        SELECT user_id, SUM (message_count) as total_sent
        FROM message_activity
        WHERE date > current_date - interval '7 days'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT $1;
    `, [count]).then(({ rows }) => rows);
}

export const fetchScoreLeaderboard = (count: number = 10) => {
    return pool.query(`
        SELECT user_id,
            sum(CASE WHEN event_type = 'loss' THEN -1 WHEN event_type = 'win' THEN 1 END) as total,
            sum(CASE WHEN event_type = 'loss' THEN 1 ELSE 0 END) as losses,
            sum(CASE WHEN event_type = 'win' THEN 1 ELSE 0 END) as wins
        FROM users_scores_events
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT $1;
    `, [count]).then(({ rows }) => rows);
}

export const fetchUserScore = async (userID: string) => {
    const { rows: [scoreRows] } = await pool.query(`
        SELECT user_id,
            sum(CASE WHEN event_type = 'loss' THEN -1 WHEN event_type = 'win' THEN 1 END) as total,
            sum(CASE WHEN event_type = 'loss' THEN 1 ELSE 0 END) as losses,
            sum(CASE WHEN event_type = 'win' THEN 1 ELSE 0 END) as wins
        FROM users_scores_events
        WHERE user_id = $1
        GROUP BY 1;
    `, [userID]);

    const { rows: [pointRows] } = await pool.query(`
        SELECT user_id, sum(nb_points) as points_spent FROM points_expenditures WHERE user_id = $1 GROUP BY 1
    `, [userID]);

    return {
        wins: scoreRows?.wins as number || 0,
        losses: scoreRows?.losses as number || 0,
        pointsSpent: pointRows?.points_spent as number || 0,
        points: (scoreRows?.wins as number || 0) - (pointRows?.points_spent as number || 0)
    };
};

export const buyProduct = async (userID: string, productID: number, createdAt: string, numberOfPoints: number, emailAddress: string): Promise<boolean> => {
    return new Promise((resolve) => {
        console.log(userID)
        pool.query(`
            INSERT INTO points_expenditures
            (user_id, nb_points, product_id, created_at, paid_at, paid, email_address) VALUES
            ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `, [userID, numberOfPoints, productID, createdAt, null, false, emailAddress]).then(({ rows }) => {
            resolve(rows[0].id);
        }).catch((e) => {
            console.log(e);
            resolve(false);
        });
    });
};

export const fetchExpendituresHistory = async (userID: string) => {
    return pool.query(`
        SELECT * FROM points_expenditures
        WHERE user_id = $1;
    `, [userID]).then(({ rows }) => rows);
};

export const markExpenditurePaid = async (id: string) => {
    return pool.query(`
        UPDATE points_expenditures
        SET paid = true,
        paid_at = $1
        WHERE id = $2;    
    `, [new Date().toISOString(), id]);
}

export const createVoiceChannel = async (channelID: string, channelAuthorID: string) => {
    return pool.query(`
        INSERT INTO voice_channels_author
        (channel_id, user_id) VALUES
        ($1, $2);
    `, [channelID, channelAuthorID]);
};

export const getVoiceChannelAuthor = async (channelID: string): Promise<string|null> => {
    return pool.query(`
        SELECT user_id FROM voice_channels_author WHERE channel_id = $1;
    `, [channelID]).then(({ rows }) => rows[0]?.user_id);
};
