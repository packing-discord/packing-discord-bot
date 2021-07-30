import { MessageEmbed, Snowflake } from 'discord.js';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create'
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
        const user = client.users.cache.get(userID) || await client.users.fetch(userID);
        const lastSeenAt = user.presence.status !== 'offline' ? new Date() : await getUserLastSeenAt(userID);
        const embed = new MessageEmbed()
        .setAuthor(`Activity of ${user.tag}`, user.displayAvatarURL())
        .setDescription(
            lastSeenAt ? `${user.username} was seen ${moment(lastSeenAt).fromNow()}`
                        : `${user.username} has not been seen for a while`
        )
        .setColor('RED');
        ctx.send({ embeds: [embed] });
    }
}
