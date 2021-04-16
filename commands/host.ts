import { MessageEmbed, TextChannel } from 'discord.js';
import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';
import client from '../';
import { createVoiceChannel } from '../db'

export default class HostCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'host',
            description: 'Create an event channel!',
            options: [
                {
                    name: 'name',
                    description: 'How should we call this channel?',
                    type: 3,
                    required: true
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });

        // Not required initially, but required for reloading with a fresh file.
        this.filePath = __filename;
    }

    async run (ctx: CommandContext) {
        const hasHostRole = ctx.member?.roles.some((roleID) => roleID === process.env.HOST_ROLE!)!;
        if (!hasHostRole) {
            ctx.send('You must have the Host role to create an event channel.', {
                ephemeral: true
            });
            return;
        }

        const server = client.guilds.cache.get(process.env.GUILD_ID!);
        server?.channels.create(ctx.options.name as string, {
            type: 'voice',
            permissionOverwrites: [
                {
                    id: ctx.guildID!,
                    deny: ['SPEAK']
                },
                {
                    id: process.env.HOST_ROLE!,
                    allow: ['PRIORITY_SPEAKER', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS']
                }
            ],
            parent: process.env.HOST_CHANNELS_CATEGORY
        }).then(async (channel) => {

            await createVoiceChannel(channel.id, ctx.user.id);
            const user = await client.users.fetch(ctx.user.id);
            const embed = new MessageEmbed()
                .setAuthor(`Creation of event channel by ${user.tag}`, user.displayAvatarURL())
                .setDescription(`The event (${channel.name}) has started`)
                .setColor('#00FF00');

            (client.channels.cache.get(process.env.HOST_LOGS_CHANNEL!)! as TextChannel).send(embed);

            channel.createInvite().then((invite) => {
                ctx.editOriginal(`:white_check_mark: Your channel ${ctx.options.name as string} has been created. Click the invite to join it! ${invite.url}`);
            });
        });
        
    }
}