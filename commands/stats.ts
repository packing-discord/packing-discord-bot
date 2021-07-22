import { Snowflake, MessageEmbed } from 'discord.js';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import client from '../';
import { getUser } from '../sequelize-user';
import jobs from '../assets/jobs.json';

export default class StatsCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'stats',
            description: 'Access your money and health!',
            options: [
                {
                    name: 'user',
                    description: 'Which user\'s stats do you want to get?',
                    type: 6,
                    required: false
                }
            ]
        });
    }

    async run (ctx: CommandContext) {
        const userID = ctx.options.user as Snowflake || ctx.member!.id;
        const isAuthor = userID === ctx.member!.id;

        const user = await client.users.fetch(userID).catch(() => {});
        const tag: string = user ? user.tag : userID;

        const userData = await getUser(userID);

        if (!userData) {
            ctx.send(`You need to create your character before running this command using \`/character create\`.`, {
                ephemeral: true
            });
            return;
        }

        const hunger = userData.hunger.toString().includes('.') && !userData.hunger.toFixed(1).endsWith('.0') ?
            userData.hunger.toFixed(1) :
            Math.round(userData.hunger);
        const health = userData.health.toString().includes('.') && !userData.health.toFixed(1).endsWith('.0') ?
            userData.health.toFixed(1) :
            Math.round(userData.health);
        const jobData = userData.job ? jobs.find((j) => j.name === userData.job) : null;

        const embed = new MessageEmbed()
            .addField(`Money`, isAuthor ? `You currently have **$${userData.money}** at the bank! :moneybag:` : `${user} has currently **$${userData.money}** at the bank! :moneybag:`)
            .addField('Health', isAuthor ? `You are currently **${health}%** healthy! :heart_decoration:` : `${user} is currently **${health}%** healthy! :heart_decoration:`)
            .addField('Hunger', isAuthor ? `You are currently **${hunger}%** fed! :fish:` : `${user} is currently **${hunger}%** fed! :fish:`)
            .addField('Job',
                isAuthor ?
                    jobData ? `You are currently a **${jobData.name}**, paid **$${jobData.salary}** per hour! :man_in_tuxedo:` :
                        `You currently have no jobs! :man_in_tuxedo:` :
                    jobData ? `${user} is currently a **${jobData.name}**, paid **$${jobData.salary}** per hour! :man_in_tuxedo:` :
                        `${user} currently has no jobs! :man_in_tuxedo:`
            )
            .addField('Foods',
                isAuthor ?
                    userData.foods.length > 0 ? `You currently have the following foods in your bag:\n\n${userData.foods.map((food) => `${food.name} | **+${food.points}%**`).join('\n')}` :
                        `You currently have no foods in your bag!` :
                    userData.foods.length > 0 ? `${user} currently has the folllowing foods in their bag:\n\n${userData.foods.map((food) => `${food.name} | **+${food.points}%**`).join('\n')}` :
                        `${user} currently has no foods in their bag!`
            )
            .setColor('RED');

        ctx.send(`<@${ctx.member!.id}>, here are ${tag}'s stats!`, {
            embeds: [
                embed.toJSON()
            ]
        });
    }
};