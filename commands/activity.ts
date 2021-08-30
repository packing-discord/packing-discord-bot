import { MessageEmbed, Snowflake } from 'discord.js';
import { CommandContext, MessageEmbedOptions, SlashCommand, SlashCreator } from 'slash-create'
import client from '..';
import { getUserLastSeenAt } from '../sequelize-presence';
import moment from 'moment';

export default class extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'activity',
            description: 'Get the user activity',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The user you want to get the activity of',
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
        const member = guild.members.cache.get(userID) || await guild.members.fetch(userID);
        const lastSeenAt = member.presence?.status !== 'offline' ? new Date() : await getUserLastSeenAt(userID);
        const embed = new MessageEmbed()
        .setAuthor(`Activity of ${member.user.tag}`, member.user.displayAvatarURL())
        .setDescription(
            lastSeenAt ? `${member.user.username} was seen <t:${Math.round(lastSeenAt.getTime()/1000)}:R>`
                        : `${member.user.username} has not been seen for a while`
        )
        .setColor('RED');
        ctx.send({ embeds: [embed.toJSON() as MessageEmbedOptions] });
    }
}
