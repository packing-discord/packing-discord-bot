import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import jobs from '../assets/jobs.json';
import { getUser, updateUser } from '../sequelize-user';

const applyCooldown = 60000 * 60;

export default class ApplyCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'apply',
            description: 'Apply for a job!',
            options: [
                {
                    name: 'job',
                    description: 'The job you want to apply for',
                    type: 3,
                    required: true,
                    choices: jobs.map((job) => ({ name: job.name, value: job.name }))
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });
    }
    async run (ctx: CommandContext) {
        const job = ctx.options.job as string;
        const userData = await getUser(ctx.member!.id);

        if (!userData) {
            ctx.send(`You need to create your character before running this command using \`/character create\`.`, {
                ephemeral: true
            });
            return;
        }

        if (userData.job) {
            ctx.send('You already have a job, use `/quit` to quit your job and apply again.', {
                ephemeral: true
            });
            return;
        }

        const lastApplyAt = new Date(userData.lastApplyAt).getTime();
        const cooldownEnd = lastApplyAt + applyCooldown;
        const cooldown = cooldownEnd > Date.now();
        if (cooldown) {
            ctx.send('You can only apply for a job every one hour, retry in ' + ((cooldownEnd - Date.now())/1000/60).toFixed(0) + ' minutes.');
            return;
        }

        const jobData = jobs.find((j) => j.name === job)!;
        const hasJob = Math.random() < jobData.chance / 100;
        if (hasJob) {
            updateUser(ctx.member!.id, {
                job: jobData.name,
                lastApplyAt: new Date().toISOString()
            });

            ctx.send(':tada: Congratulations, you got the job! Get your salary ' + jobData.salary + ' every hour by using `/work`!', {
                ephemeral: false
            });
        } else {
            updateUser(ctx.member!.id, {
                lastApplyAt: new Date().toISOString()
            });

            ctx.send(':x: Your application has been rejected! You will be able to submit a new one in one hour.', {
                ephemeral: false
            });
        }
    }
}