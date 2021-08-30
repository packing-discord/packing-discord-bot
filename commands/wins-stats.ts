import { GuildMember, Snowflake } from 'discord.js';
import { fetchUserScore, fetchUserScoreEvents } from '../db';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
import client from '..';
import applyRanks from '../apply-ranks';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'wins-stats',
            description: 'Get the wins statistics of a user',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The user you want to get the wins stats of'
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
        const member = client.guilds.cache.get(ctx.guildID)!.members.cache.get(userID) ?? await client.guilds.cache.get(ctx.guildID)!.members.fetch(userID).catch(() => {});
        const score = await fetchUserScore(userID);
        applyRanks(score.points, member as GuildMember);
        ctx.send(`${user} has **${score.wins}** wins and **${score.losses}** losses, for a score of **${score.wins - score.losses}**!`);
    }
}
