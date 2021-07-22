import { Snowflake } from 'discord.js';
import { Model, DataTypes } from 'sequelize';
import { database } from './sequelize';
import { Food } from './types/food';

export class User extends Model {
  public id!: string;
  public job!: string|null;
  public money!: number;
  public health!: number;
  public hunger!: number;
  public foods!: Food[];
  public lastApplyAt!: string;
  public lastWorkAt!: string;
  public workTimes!: number;
  public workLevel!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}
User.init(
    {
        id: {
            type: new DataTypes.CHAR(32),
            primaryKey: true,
            allowNull: false
        },
        job: {
            type: new DataTypes.STRING(32),
            allowNull: true
        },
        money: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        health: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100000,
            set (value: number) {
                this.setDataValue('health', Math.round(value * 1000));
            },
            get () {
                return this.getDataValue('health') / 1000;
            }
        },
        hunger: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100000,
            set (value: number) {
                if (value > 100) value = 100;
                this.setDataValue('hunger', Math.round(value * 1000));
            },
            get () {
                return this.getDataValue('hunger') / 1000;
            }
        },
        foods: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
        },
        lastApplyAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 0
        },
        lastWorkAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 0
        },
        workTimes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        workLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'users',
        sequelize: database
    }
);

if (process.argv.includes('--init')) setTimeout(() => User.sync({ force: true }).then(() => console.log('User table created')), 5000);
if (process.argv.includes('--sync')) User.sync({ alter: true }).then(() => console.log('User table synced'));

export const getUsers = (): Promise<User[]> => {
    return new Promise((resolve) => {
        User.findAll().then((res) => {
            resolve(res);
        });
    });
};

/*
export const updateUsers = (): Promise<void> => {
    return new Promise((resolve) => {
    });
};
*/

export const createUser = (userID: Snowflake): Promise<User> => {
    return new Promise((resolve) => {
        User.create({
            id: userID
        }).then((res) => {
            resolve(res);
        });
    });
};

export const deleteUser = (userID: Snowflake): Promise<void> => {
    return new Promise((resolve) => {
        User.destroy({
            where: {
                id: userID
            }
        }).then(() => {
            resolve();
        });
    });
};

export const getUser = (userID: Snowflake): Promise<User|null> => {
    return new Promise((resolve) => {
        User.findOne({
            where: {
                id: userID
            }
        }).then((res) => {
            resolve(res);
        });
    });
};

export const updateUser = (userID: Snowflake, newData: Partial<User>): Promise<void> => {
    return new Promise((resolve) => {
        User.update(newData, {
            where: {
                id: userID
            }
        }).then(() => {
            resolve();
        });
    });
};