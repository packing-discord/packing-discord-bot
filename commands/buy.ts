import { TextChannel } from 'discord.js';
import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';
import client from '../';
import { getUser, updateUser } from '../sequelize-user';
import { Food } from '../types/food';

export default class BuyCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'buy',
            description: 'Buy food to eat it later!',
            options: [
                {
                    type: 3,
                    name: 'food',
                    description: 'The type of food you want to buy!',
                    required: true
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });

        // Not required initially, but required for reloading with a fresh file.
        this.filePath = __filename;
    }

    async parseChannel (channel: TextChannel): Promise<Food[]> {
        const priceRegex = /^([^$]+)([$0-9.]+)\s([0-9]+%)/;
        await channel.messages.fetch({ limit: 100 });
        return channel.messages.cache.map((message) => {
            return message.content.split('\n')
                .filter((e) => priceRegex.test(e))
                .map((e) => {
                    const [, foodName, foodPrice, foodPoints] = e.match(priceRegex) as RegExpMatchArray;
                    return {
                        name: foodName.trim(),
                        price: parseInt(foodPrice.split('$')[1]),
                        points: parseInt(foodPoints.split('%')[0])
                    };
                });
        }).flat();
    }

    async run (ctx: CommandContext) {
        const userData = await getUser(ctx.member!.id);
        if (!userData) {
            ctx.send(`You need to create your character before running this command using \`/character create\`.`, {
                ephemeral: true
            });
            return;
        }

        const channel = client.channels.cache.get(ctx.channelID) as TextChannel;
        const menuChannel = channel.parent?.children.find((child) => ['menu', 'shop', 'stock'].includes(child.name)) as TextChannel;
        if (!menuChannel) {
            ctx.send('There is nothing to buy here!', {
                ephemeral: true
            });
            return;
        }

        const foods = await this.parseChannel(menuChannel);
        const foodName = (ctx.options.food as string).toLowerCase();
        const foodData = foods.find((food) => food.name.toLowerCase() === foodName);
        if (!foodData) {
            ctx.send('This type of food does not exist!', {
                ephemeral: true
            });
            return;
        }

        if (foodData.price > userData.money) {
            ctx.send(`:x: You need **$${foodData.price}** to buy this ${foodData.name}!`);
            return;
        }

        updateUser(ctx.member!.id, {
            money: userData.money - foodData.price,
            foods: [...userData.foods, ...[foodData]]
        });

        ctx.send(`:white_check_mark: Congratulations, you bought a ${foodData.name}! You can eat it using \`/eat ${foodData.name}\`. You will gain **+${foodData.points}%** of hunger!`);
    }
};