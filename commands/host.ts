import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
import client from '../';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'host',
            description: 'Create a host channel',
            options: [
                {
                    type: 5,
                    name: 'stage',
                    description: 'Whether the channel should be a stage channel or not'
                }
            ],
            requiredPermissions: [],
            guildIDs: [process.env.GUILD_ID!]
        });
        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        if (!ctx.guildID || !ctx.member) return;
        const stage = ctx.options.stage as boolean;
        const guild = client.guilds.cache.get(ctx.guildID)!;
    }
}
