/**
 * Validation middleware using express-validator
 * Provides reusable validation rules for common fields
 */
import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to check validation results and return standardized errors
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
}

/**
 * Common validation rules
 */
export const validators = {
  // User validation
  email: body('email')
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  phone: body('phone')
    .optional()
    .trim()
    .matches(/^(\+?250|0)[7][0-9]{8}$/).withMessage('Invalid Rwanda phone number. Must start with +250 or 0, followed by 7 and 8 more digits (e.g., +250788123456 or 0788123456)')
    .isLength({ min: 10, max: 13 }).withMessage('Phone number must be 10-13 characters'),
  
  dateOfBirth: body('profile.dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      const maxAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
      
      if (date > now) {
        throw new Error('Date of birth cannot be in the future');
      }
      if (date < minAge) {
        throw new Error('Invalid date of birth (too old)');
      }
      if (date > maxAge) {
        throw new Error('You must be at least 13 years old to register');
      }
      return true;
    }),
  
  password: body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
  
  role: body('role')
    .optional()
    .isIn(['admin', 'farmer', 'student', 'trainer']).withMessage('Invalid role'),
  
  // Device/Sensor validation
  deviceId: body('deviceId')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Device ID must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Device ID can only contain letters, numbers, hyphens, and underscores'),
  
  deviceIdParam: param('id')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  // Sensor data validation
  temperature: body('temperature')
    .optional()
    .isFloat({ min: -50, max: 100 }).withMessage('Temperature must be between -50 and 100°C'),
  
  humidity: body('humidity')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Humidity must be between 0 and 100%'),
  
  soilMoisture: body('soilMoisture')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Soil moisture must be between 0 and 100%'),
  
  waterLevel: body('waterLevel')
    .optional()
    .isFloat({ min: 0, max: 1000 }).withMessage('Water level must be between 0 and 1000cm'),
  
  // Query params
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
    .toInt(),
  
  offset: query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a positive integer')
    .toInt(),
  
  // Course validation
  courseTitle: body('title')
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Course title must be between 5 and 200 characters'),
  
  courseLevel: body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid course level'),
  
  // MongoDB ObjectId validation
  mongoId: param('id')
    .isMongoId().withMessage('Invalid ID format'),
};

/**
 * Validation rule sets for specific endpoints
 */
export const validationRules = {
  register: [
    validators.name,
    body('email')
      .optional({ values: 'falsy' })
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    validators.phone,
    validators.password,
    validators.role,
    validators.dateOfBirth,
    body().custom((value) => {
      if (!value?.email && !value?.phone) {
        throw new Error('Either email or phone is required');
      }
      return true;
    }),
    validate
  ],
  
  login: [
    body('email')
      .optional({ values: 'falsy' })
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^(\+?250|0)[7][0-9]{8}$/).withMessage('Invalid Rwanda phone number. Must start with +250 or 0, followed by 7 and 8 more digits (e.g., +250788123456 or 0788123456)'),
    body().custom((value) => {
      if (!value?.email && !value?.phone) {
        throw new Error('Email or phone is required');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  
  updateProfile: [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').optional().trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional().trim().matches(/^(\+?250|0)?[7][0-9]{8}$/).withMessage('Invalid phone number format'),
    validate
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validate
  ],
  
  createDevice: [
    validators.deviceId,
    body('label').trim().isLength({ min: 2, max: 100 }).withMessage('Label must be between 2 and 100 characters'),
    body('location').optional().trim().isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
    validate
  ],
  
  ingestSensorData: [
    validators.deviceId,
    validators.temperature,
    validators.humidity,
    validators.soilMoisture,
    validators.waterLevel,
    body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format'),
    validate
  ],
  
  createCourse: [
    validators.courseTitle,
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
    validators.courseLevel,
    validate
  ],
  
  paginationQuery: [
    validators.limit,
    validators.offset,
    validate
  ],
};
