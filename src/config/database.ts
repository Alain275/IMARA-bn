import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'imara_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync models in development with proper order
    if (process.env.NODE_ENV === 'development') {
      // Import models to ensure they're loaded
      const { 
        User, 
        Crop, 
        Farm, 
        FarmerCrop, 
        SoilTest, 
        DiseaseDetection, 
        MarketPrice, 
        Notification,
        AgronomistProfile,
        FarmVisit,
        Advice,
        Question,
        TrainingMaterial,
        Course,
        Enrollment
      } = require('../models');

      // Sync in order: parent tables first, then child tables
      await User.sync({ alter: true });
      await Crop.sync({ alter: true });
      await Farm.sync({ alter: true });
      await Course.sync({ alter: true });
      
      // Then tables with foreign keys
      await AgronomistProfile.sync({ alter: true });
      await FarmerCrop.sync({ alter: true });
      await SoilTest.sync({ alter: true });
      await DiseaseDetection.sync({ alter: true });
      await MarketPrice.sync({ alter: true });
      await Notification.sync({ alter: true });
      await FarmVisit.sync({ alter: true });
      await Advice.sync({ alter: true });
      await Question.sync({ alter: true });
      await TrainingMaterial.sync({ alter: true });
      await Enrollment.sync({ alter: true });
      
      console.log('📊 Database models synchronized');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export default sequelize;
