import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';
import { getUser, updateUser } from '../sequelize-user';
import { Food } from '../types/food';

export default class EatCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'eat',
            description: 'Eat something to gain hunger percents!',
            options: [
                {
                    type: 3,
                    name: 'food',
                    description: 'The type of food you want to eat!',
                    required: true
                }
            ],
            guildIDs: [process.env.GUILD_ID!]
        });

        // Not required initially, but required for reloading with a fresh file.
        this.filePath = __filename;
    }

    async run (ctx: CommandContext) {
        const userData = await getUser(ctx.member!.id);

        if (!userData) {
            ctx.send(`You need to create your character before running this command using \`/character create\`.`, {
                ephemeral: true
            });
            return;
        }

        const foodName = ctx.options.food;
        const foodData = userData.foods.find((food) => food.name.toLocaleLowerCase() === (foodName as string).toLowerCase());
        if (!foodData) {
            ctx.send(`You don't have any food named ${foodName}!`, {
                ephemeral: true
            });
            return;
        }

        if (userData.hunger === 100) {
            ctx.send(':x: You are not hungry!');
            return;
        }

        const newFoods: Food[] = [];
        let removed = false;
        userData.foods.forEach((food) => {
            if (removed) newFoods.push(food);
            else {
                if (food.name === foodName) removed = false;
                else newFoods.push(food);
            }
        });

        updateUser(ctx.member!.id, {
            hunger: userData.hunger + foodData.points,
            foods: newFoods
        });

        ctx.send(`:white_check_mark: You've eaten a ${foodData.name} and have gained **+${foodData.points}%** of hunger!`);
    }
};