import { Snowflake } from 'discord.js';
import { removeScoreEvent, fetchUserScore } from '../db';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
import client, { updateWinsLeaderboard } from '..';
import applyRanks from '../apply-ranks';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'del-win',
            description: 'Deletes a win from a user',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The user you want to add the win from',
                    required: true
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });
        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        if (!ctx.guildID || !ctx.member) return;
        const userID = ctx.options.user as Snowflake;
        const guild = client.guilds.cache.get(ctx.guildID)!;
        const member = guild.members.cache.get(ctx.member.id) || await guild.members.fetch(ctx.member.id).catch(() => {});
        if (!member || !member.roles.cache.has(process.env.MOD_PLUS_ID!)) {
            ctx.send('The command was not able to verify your permissions... Please retry!', {
                ephemeral: true
            });
            return;
        };
        ctx.send('Win deleted successfully!');
        await removeScoreEvent(userID, 'win');
        updateWinsLeaderboard();

        const score = await fetchUserScore(ctx.user.id);
        applyRanks(score.points, member);
    }
}
