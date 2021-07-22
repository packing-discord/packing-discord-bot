import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import { getUser, updateUser } from '../sequelize-user';

export default class PromotionCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'promotion',
            description: 'Ask for a promotion!',
            guildIDs: [process.env.GUILD_ID!]
        });
    }
    async run (ctx: CommandContext) {
        const userData = await getUser(ctx.member!.id);

        if (!userData) {
            ctx.send(`You need to create your character before running this command using \`/character create\`.`, {
                ephemeral: true
            });
            return;
        }

        if (!userData.job) {
            ctx.send('You currently don\'t have any job, use `/apply` to apply for a job.', {
                ephemeral: true
            });
            return;
        } else {
            const requiredWorkTimes = (userData.workLevel || 1)* 10 + userData.workLevel * 2;
            if (userData.workTimes >= requiredWorkTimes) {
                ctx.send(`:tada: You get your promotion! You will now be paid **$2** additional per hour!`, {
                    ephemeral: false
                });
                updateUser(ctx.member!.id, {
                    workLevel: userData.workLevel + 1
                });
            } else {
                ctx.send(`:x: You need to send \`/work\` **${requiredWorkTimes - userData.workTimes}** times before being able to get a promotion!`);
            }
        }
    }
};