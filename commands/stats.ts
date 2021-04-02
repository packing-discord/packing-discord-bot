import { Snowflake } from 'discord.js';
import { fetchUserScoreEvents } from '../db';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
import client from '../';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'stats',
            description: 'Get the statistics of a user',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The user you want to get the stats of'
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });
        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        if (!ctx.guildID || !ctx.member) return;
        const userID = ctx.options.user as Snowflake || ctx.member.id;
        const user = client.users.cache.get(userID) || await client.users.fetch(userID).catch(() => {});
        if (!user) {
            ctx.send('Unable to find this user on Discord...', {
                ephemeral: true
            });
            return;
        }
        fetchUserScoreEvents(userID).then((events) => {
            const wins = events.filter((event) => (event as Record<string, string>).event_type === 'win').length;
            const losses = events.filter((event) => (event as Record<string, string>).event_type === 'loss').length;
            ctx.send(`${user} has **${wins}** wins and **${losses}** losses!`);
        });
    }
}
