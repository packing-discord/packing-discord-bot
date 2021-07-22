import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import jobs from '../assets/jobs.json';

export default class JobsCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'jobs',
            description: 'Displays the list of the available Jobs in Thizz Land!',
            guildIDs: [process.env.GUILD_ID!]
        });
    }
    async run (ctx: CommandContext) {
        ctx.send(
            'Here is the list of the available jobs! Use \`/apply\` to apply for a job!\n\n'+
            jobs.reverse().map((job) => `${job.name} - $${job.salary} per hour`).join('\n')
        );
    }
}