import { Sequelize } from 'sequelize';
export const database = new Sequelize({
    dialect: 'postgres',
    database: process.env.SEQ_PG_NAME,
    username: process.env.SEQ_PG_USERNAME,
    password: process.env.SEQ_PG_PASSWORD
});
