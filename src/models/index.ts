import User from './User';
import Crop from './Crop';
import SoilTest from './SoilTest';
import DiseaseDetection from './DiseaseDetection';
import Course from './Course';
import Enrollment from './Enrollment';
import Farm from './Farm';
import FarmerCrop from './FarmerCrop';
import MarketPrice from './MarketPrice';
import Notification from './Notification';

// Define relationships

// User has many Farms
User.hasMany(Farm, {
  foreignKey: 'userId',
  as: 'farms',
});
Farm.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User has many FarmerCrops
User.hasMany(FarmerCrop, {
  foreignKey: 'userId',
  as: 'farmerCrops',
});
FarmerCrop.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Crop has many FarmerCrops
Crop.hasMany(FarmerCrop, {
  foreignKey: 'cropId',
  as: 'farmerCrops',
});
FarmerCrop.belongsTo(Crop, {
  foreignKey: 'cropId',
  as: 'crop',
});

// Farm has many FarmerCrops
Farm.hasMany(FarmerCrop, {
  foreignKey: 'farmId',
  as: 'crops',
});
FarmerCrop.belongsTo(Farm, {
  foreignKey: 'farmId',
  as: 'farm',
});

// User has many SoilTests
User.hasMany(SoilTest, {
  foreignKey: 'userId',
  as: 'soilTests',
});
SoilTest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User has many DiseaseDetections
User.hasMany(DiseaseDetection, {
  foreignKey: 'userId',
  as: 'diseaseDetections',
});
DiseaseDetection.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Crop has many DiseaseDetections
Crop.hasMany(DiseaseDetection, {
  foreignKey: 'cropId',
  as: 'diseaseDetections',
});
DiseaseDetection.belongsTo(Crop, {
  foreignKey: 'cropId',
  as: 'crop',
});

// Crop has many MarketPrices
Crop.hasMany(MarketPrice, {
  foreignKey: 'cropId',
  as: 'marketPrices',
});
MarketPrice.belongsTo(Crop, {
  foreignKey: 'cropId',
  as: 'crop',
});

// User has many Notifications
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications',
});
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User has many Enrollments
User.hasMany(Enrollment, {
  foreignKey: 'userId',
  as: 'enrollments',
});
Enrollment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Course has many Enrollments
Course.hasMany(Enrollment, {
  foreignKey: 'courseId',
  as: 'enrollments',
});
Enrollment.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course',
});

// Many-to-Many: Users and Courses through Enrollments
User.belongsToMany(Course, {
  through: Enrollment,
  foreignKey: 'userId',
  otherKey: 'courseId',
  as: 'courses',
});

Course.belongsToMany(User, {
  through: Enrollment,
  foreignKey: 'courseId',
  otherKey: 'userId',
  as: 'students',
});

export {
  User,
  Crop,
  Farm,
  FarmerCrop,
  SoilTest,
  DiseaseDetection,
  MarketPrice,
  Notification,
  Course,
  Enrollment,
};

