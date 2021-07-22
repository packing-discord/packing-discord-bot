import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import { getUser, updateUser } from '../sequelize-user';

export default class QuitCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'quit',
            description: 'Quit your current job!',
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
            const previousJob = userData.job;

            updateUser(ctx.member!.id, {
                job: null
            });

            ctx.send(':white_check_mark: You are no longer a ' + previousJob.toLocaleLowerCase() + '!');
        }
    }
};