import { Snowflake } from 'discord.js';
import { addScoreEvent } from '../db';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
import client from '../';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'addloss',
            description: 'Adds a loss to a user',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The user you want to add the loss to'
                }
            ]
        });
        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        if (!ctx.guildID || !ctx.member) return;
        const userID = ctx.options.userID as Snowflake;
        const guild = client.guilds.cache.get(ctx.guildID)!;
        const member = guild.members.cache.get(ctx.member.id) || await guild.members.fetch(ctx.member.id).catch(() => {});
        if (!member || !member.permissions.has('MANAGE_MESSAGES')) {
            ctx.send('The command was not able to verify your permissions... Please retry!', {
                ephemeral: true
            });
            return;
        };
        addScoreEvent(userID, ctx.member.id, new Date(), 'loss');
    }
}
