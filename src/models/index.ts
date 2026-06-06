import User from './User';
import Crop from './Crop';
import SoilTest from './SoilTest';
import DiseaseDetection from './DiseaseDetection';
import Course from './Course';
import Enrollment from './Enrollment';

// Define relationships

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
  SoilTest,
  DiseaseDetection,
  Course,
  Enrollment,
};
