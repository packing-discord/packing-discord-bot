import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import { getUser, updateUser } from '../sequelize-user';
import jobs from '../assets/jobs.json';

const workCooldown = 60000 * 60;

export default class WorkCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'work',
            description: 'Work and claim your salary!',
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
            const lastWorkAt = new Date(userData.lastWorkAt).getTime();
            const cooldownEnd = lastWorkAt + workCooldown;
            const cooldown = cooldownEnd > Date.now();
            if (cooldown) {
                ctx.send('You can only work every one hour, retry in ' + ((cooldownEnd - Date.now())/1000/60).toFixed(0) + ' minutes.');
                return;
            }

            const jobData = jobs.find((j) => j.name === userData.job)!;
            const salary = userData.workLevel * 2 + jobData.salary;

            updateUser(ctx.member!.id, {
                workTimes: userData.workTimes+1,
                money: userData.money + salary,
                lastWorkAt: new Date().toISOString()
            });

            ctx.send(':tada: You worked and were paid **$' + salary + '**!');
        }
    }
}