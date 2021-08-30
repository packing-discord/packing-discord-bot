import { Snowflake } from 'discord.js';
import { Model, DataTypes } from 'sequelize';
import { database } from './sequelize';

export class UserPresence extends Model {
  public id!: string;
  public lastSeenAt!: Date;
}
UserPresence.init(
    {
        id: {
            type: new DataTypes.CHAR(32),
            primaryKey: true,
            allowNull: false
        },
        lastSeenAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'users-presences',
        sequelize: database
    }
);

if (process.argv.includes('--init')) setTimeout(() => UserPresence.sync({ force: true }).then(() => console.log('Users presences table created')), 5000);
if (process.argv.includes('--sync')) UserPresence.sync({ alter: true }).then(() => console.log('Users presences table synced'));

export const getUserLastSeenAt = (userID: Snowflake): Promise<any> => {
    return new Promise((resolve) => {
        UserPresence.findOne({
            where: {
                id: userID
            }
        }).then((presence) => resolve(presence?.lastSeenAt));
    });
};

export const updateUserLastSeenAt = (userID: Snowflake): Promise<void> => {
    return new Promise((resolve) => {
        UserPresence.findOne({
            where: {
                id: userID
            }
        }).then((presence) => {
            if (presence) {
                UserPresence.update({
                    lastSeenAt: new Date()
                }, {
                    where: {
                        id: userID
                    }
                }).then(() => resolve());
            } else {
                UserPresence.create({
                    lastSeenAt: new Date(),
                    id: userID
                }).then(() => resolve());
            }
        });
    });
};
