export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'IMARA Agricultural Platform API',
    version: '1.0.0',
    description: 'Smart Agricultural Advisory System API for Rwandan Farmers',
    contact: {
      name: 'IMARA Team',
      email: 'support@imara.rw',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://api.imara.rw',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management' },
    { name: 'Farms', description: 'Farm management' },
    { name: 'Crops', description: 'Crop information and recommendations' },
    { name: 'Weather', description: 'Weather forecasts and alerts' },
    { name: 'Soil', description: 'Soil analysis and recommendations' },
    { name: 'Disease', description: 'Disease detection and management' },
    { name: 'Market', description: 'Market prices and trends' },
    { name: 'Notifications', description: 'User notifications' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          role: {
            type: 'string',
            enum: ['farmer', 'agronomist', 'admin', 'cooperative'],
          },
          location: { type: 'string' },
          farmSize: { type: 'number' },
          isEmailVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user account and sends an OTP to the provided email for verification.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'StrongPass123!' },
                  phone: { type: 'string', example: '+250788000000' },
                  role: { type: 'string', enum: ['farmer', 'agronomist', 'admin', 'cooperative'], example: 'farmer' },
                  location: { type: 'string', example: 'Kigali, Rwanda' },
                  farmSize: { type: 'number', example: 2.5 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully. OTP sent to email.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registration successful. Please verify your email with the OTP sent to your inbox.' },
                    data: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' },
                        isEmailVerified: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify email with OTP',
        description: 'Verifies the user\'s email using the 6-digit OTP sent during registration. Returns JWT tokens on success.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  otp: { type: 'string', example: '482910' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Email verified. Returns access & refresh tokens.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Email verified successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/resend-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend OTP',
        description: 'Resends the email verification OTP to the user\'s email address.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP resent successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OTP resent successfully' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login',
        description: 'Authenticates a verified user and returns JWT access and refresh tokens.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'StrongPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful. Returns user profile and tokens.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Returns the authenticated user\'s profile. Requires a valid Bearer token.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset',
        description: 'Sends a password reset link to the user\'s email.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset email sent.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password reset email sent' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password',
        description: 'Resets the user\'s password using the token received by email. Returns new JWT tokens.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', example: 'abc123resettoken' },
                  password: { type: 'string', format: 'password', example: 'NewStrongPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset successful. Returns new tokens.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password reset successful' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Issues a new access token and refresh token using a valid refresh token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens refreshed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
  },
};
