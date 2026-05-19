/**
 * Centralized error handling middleware
 * Provides consistent error responses across the application
 */

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types for common scenarios
 */
export const ErrorTypes = {
  ValidationError: (details) => new AppError('Validation failed', 400, details),
  AuthenticationError: (message = 'Authentication required') => new AppError(message, 401),
  AuthorizationError: (message = 'Insufficient permissions') => new AppError(message, 403),
  NotFoundError: (resource = 'Resource') => new AppError(`${resource} not found`, 404),
  ConflictError: (message = 'Resource already exists') => new AppError(message, 409),
  RateLimitError: () => new AppError('Too many requests, please try again later', 429),
  ServerError: (message = 'Internal server error') => new AppError(message, 500),
};

/**
 * Handle MongoDB duplicate key errors
 */
function handleDuplicateKeyError(err) {
  let field = 'field';
  if (err.keyPattern) {
    field = Object.keys(err.keyPattern)[0];
  } else if (err.keyValue) {
    field = Object.keys(err.keyValue)[0];
  } else if (typeof err.message === 'string') {
    if (err.message.includes('index: email_')) field = 'email';
    if (err.message.includes('index: phone_')) field = 'phone';
  }
  return new AppError(`${field} already in use`, 409, { field, value: err.keyValue?.[field] });
}

/**
 * Handle Mongoose validation errors
 */
function handleValidationError(err) {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message,
    value: e.value
  }));
  return new AppError('Validation failed', 400, errors);
}

/**
 * Handle Mongoose cast errors (invalid ObjectId, etc.)
 */
function handleCastError(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
}

/**
 * Handle JWT errors
 */
function handleJWTError() {
  return new AppError('Invalid token, please login again', 401);
}

function handleJWTExpiredError() {
  return new AppError('Token expired, please login again', 401);
}

/**
 * Global error handler middleware
 * Should be placed after all routes
 */
export function errorHandler(err, req, res, next) {
  let error = err;

  // Log error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Handle specific error types
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Default to 500 if no status code
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong';

  // Send error response
  const response = {
    error: message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV !== 'production' && !error.isOperational && { stack: err.stack })
  };

  res.status(statusCode).json(response);
}

/**
 * Async error wrapper to catch errors in async route handlers
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }))
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
}
