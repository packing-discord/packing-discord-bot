import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';
import client from '..';
import { getVoiceChannelAuthor } from '../db';

export default class EatCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'delete',
            description: 'Delete the current event',
            options: [],
            guildIDs: [process.env.GUILD_ID!]
        });

        // Not required initially, but required for reloading with a fresh file.
        this.filePath = __filename;
    }

    async run (ctx: CommandContext) {

        const hasHostRole = ctx.member?.roles.some((roleID) => roleID === process.env.HOST_ROLE!)!;
        if (!hasHostRole) {
            ctx.send('You must have the Host role to delete an event channel.', {
                ephemeral: true
            });
            return;
        }
        
        const guild = client.guilds.cache.get(process.env.GUILD_ID!)!;
        const member = guild.members.cache.get(ctx.user.id) ?? await guild.members.fetch(ctx.user.id);

        const voiceChannelID = member.voice.channelId;
        if (!voiceChannelID) {
            return ctx.send('You need to be in a voice channel to use this command.');
        }
        
        const authorUserID = await getVoiceChannelAuthor(voiceChannelID);
        if (!authorUserID) {
            return ctx.send('Could not retrieve the author of this channel. Maybe this is not an event channel?');
        }
        if (authorUserID !== ctx.user.id) {
            return ctx.send('Only the author of the event can delete it.');
        }

        await client.channels.cache.get(voiceChannelID)!.delete();
        await ctx.send('Event deleted!');
    }
};