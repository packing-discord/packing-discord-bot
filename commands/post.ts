import { MessageEmbed, Snowflake, TextChannel } from 'discord.js';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import client from '../';

interface FormData {
    request?: string;
    paymentCurrency?: 'robux' | 'usd';
    paymentAmount?: number;
    paymentType?: 'Upon completion' | 'Immediately';
    contact?: string;
}

export default class PostCommand extends SlashCommand {

    private currentUsers: Set<Snowflake>;

    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'post',
            description: 'Apply for a post at Packing',
            guildIDs: [process.env.GUILD_ID!]
        });

        this.currentUsers = new Set<Snowflake>();
    }

    async run (ctx: CommandContext) {
        
        if (this.currentUsers.has(ctx.user.id)) return void ctx.send(`You have already applied for a post.`);

        const formData: FormData = {};
        
        const user = client.users.cache.get(ctx.user.id) ?? await client.users.fetch(ctx.user.id);
        const channel = client.channels.cache.get(ctx.channelID) as TextChannel;
        const collector = channel.createMessageCollector({
            time: 3 * 60000,
            filter: (message) => message.author.id === ctx.user.id
        });

        ctx.send(`Hello <@${ctx.user.id}>, I will ask some questions about your request. You can cancel at any time by sending \`-cancel\`. First, what do you except (the final result):`);

        collector.on('collect', (message) => {

            if (message.content === '-cancel') {
                return void collector.stop('cancel');
            }

            if (formData.paymentType && !formData.contact) {
                formData.contact = message.content;
                message.reply(`:white_check_mark: Your request has been saved! We will get back to you as soon as possible!`);
                const embed = new MessageEmbed()
                .setAuthor(`Request by ${user.tag}`, user.displayAvatarURL())
                .addField(`Request`, formData.request!)
                .addField('Currency', formData.paymentCurrency!)
                .addField('Amount', formData.paymentAmount!.toString())
                .addField('Type', formData.paymentType)
                .addField('Contact', formData.contact)
                .setColor('RED');
                (client.channels.cache.get(process.env.POSTS_CHANNEL_ID!) as TextChannel).send({ embeds: [embed] });
            }

            if (formData.paymentAmount && !formData.paymentType) {
                if (!['c', 'i'].includes(message.content.toLowerCase())) return void message.reply(`\`C\` or \`I\` are the only valid responses. Please check again and retry.`);
                formData.paymentType = message.content.toLowerCase() === 'c' ? 'Upon completion' : 'Immediately';
                message.reply(`fine. We will now only need some contact information to get back to you:`);
            }

            if (formData.paymentCurrency && !formData.paymentAmount) {
                if (isNaN(parseFloat(message.content))) return void message.reply(`this is not a valid number. Please check again and retry.`);
                formData.paymentAmount = parseFloat(message.content);
                message.reply(`okay! Please now enter the payment type. Use \`C\` for Upon completion payment type and \`I\` for Immediately payment type.`);
            }

            if (formData.request && !formData.paymentCurrency) {
                if (!['r', 'u'].includes(message.content.toLowerCase())) return void message.reply(`\`R\` or \`U\` are the only valid responses. Please check again and retry.`);
                formData.paymentCurrency = message.content.toLowerCase() === 'r' ? 'robux' : 'usd';
                message.reply(`saved! Please now enter the amount of the payment. It should be a number (please do not add $, €, or anything before or after the number).`);
            }

            if (!formData.request) {
                formData.request = message.content;
                message.reply(`all right! Please now enter your payment currency. Send \`R\` for Roblux or \`U\` for USD.`);
            }

        });

        collector.on('end', (_, reason) => {

            this.currentUsers.delete(ctx.user.id);

            if (reason === 'time') {
                return void channel.send(`<@${ctx.user.id}>, your request have been cancelled!`);
            }

        });
    }
}