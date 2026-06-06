import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const useSSL = process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'imara_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: useSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false // set to true in prod with a valid CA cert
          }
        }
      : {}
  }
);

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Always sync to ensure tables exist
    await sequelize.sync({ alter: true });
    console.log('📊 Database models synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export default sequelize;
