import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';

export default class TimeCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'time',
            description: 'Get the current time in Thizz Land!',
            guildIDs: [process.env.GUILD_ID!]
        });

        // Not required initially, but required for reloading with a fresh file.
        this.filePath = __filename;
    }

    async run (ctx: CommandContext) {
        const emoji = new Date().getMinutes() > 19 || new Date().getMinutes() < 8 ? ':night_with_stars:' : ':sunrise_over_mountains:';
        const time = new Date().getMinutes() > 12 ? `${new Date().getMinutes()-12}:${new Date().getSeconds()} pm` : `${new Date().getMinutes()}:${new Date().getSeconds()} am`;
        ctx.send(`It is currently ${time} in Thizz Land! ${emoji}`);
    }
};