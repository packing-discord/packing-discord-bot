import { SlashCreator, SlashCommand, CommandContext } from 'slash-create';
import { createUser, deleteUser, getUser } from '../sequelize-user';

export default class CreateCharacterCommand extends SlashCommand {
    constructor (creator: SlashCreator) {
        super(creator, {
            name: 'character',
            description: 'Create or delete your character!',
            options: [
                {
                    type: 3,
                    name: 'action',
                    description: 'Do you want to delete or create your character?',
                    choices: [
                        {
                            name: 'create',
                            value: 'create'
                        },
                        {
                            name: 'delete',
                            value: 'delete'
                        }
                    ],
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
        if (ctx.options.action === 'create') {
            if (userData) {
                ctx.send('Your character is already created!', {
                    ephemeral: true
                });
                return;
            }
            await createUser(ctx.member!.id);
            ctx.send('Your character has been created!');
        } else {
            if (!userData) {
                ctx.send('Your character is not created yet! Use \`/character create\` to create it!', {
                    ephemeral: true
                });
                return;
            }
            await deleteUser(ctx.member!.id);
            ctx.send('Your character has been deleted!');
        }
    }
};