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
        description: 'Creates a new user account and sends a verification link to the provided email.',
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
            description: 'User registered successfully. Verification link sent to email.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registration successful. Please check your email and click the verification link to activate your account.' },
                    data: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' },
                        isEmailVerified: { type: 'boolean', example: false },
                        verificationToken: { type: 'string', description: 'Verification token (for testing)' },
                        verifyURL: { type: 'string', description: 'Full verification URL (for testing)' },
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
    '/api/auth/verify-email/{token}': {
      get: {
        tags: ['Authentication'],
        summary: 'Verify email via token link',
        description: 'Verifies the user\'s email using the token from the verification link. Redirects to the frontend with JWT tokens on success.',
        security: [],
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            description: 'Verification token from the email link',
            schema: { type: 'string' },
          },
        ],
        responses: {
          302: {
            description: 'Email verified. Redirects to frontend with access & refresh tokens in query params.',
          },
          400: {
            description: 'Invalid or expired verification link.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend verification email',
        description: 'Resends the email verification link to the user\'s email address.',
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
            description: 'Verification email resent successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Verification email resent successfully. Check your inbox.' },
                    data: {
                      type: 'object',
                      properties: {
                        verificationToken: { type: 'string', description: 'Verification token (for testing)' },
                        verifyURL: { type: 'string', description: 'Full verification URL (for testing)' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
          404: { $ref: '#/components/responses/NotFoundError' },
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
    // User Management APIs
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        description: 'Returns the authenticated user\'s profile.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile retrieved successfully.',
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
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user profile',
        description: 'Updates the authenticated user\'s profile. Only provided fields will be updated.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'John Updated' },
                  phone: { type: 'string', example: '+250788111111' },
                  location: { type: 'string', example: 'Kigali, Rwanda' },
                  farmSize: { type: 'number', example: 3.5 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/users/password': {
      patch: {
        tags: ['Users'],
        summary: 'Change password',
        description: 'Changes the authenticated user\'s password.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password', example: 'OldPass123!' },
                  newPassword: { type: 'string', format: 'password', example: 'NewPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password changed successfully' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/users/account': {
      delete: {
        tags: ['Users'],
        summary: 'Delete account',
        description: 'Soft deletes the user\'s account (deactivates it).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', format: 'password', example: 'MyPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Account deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Account deleted successfully' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Get all users (Admin only)',
        description: 'Returns a paginated list of all users with optional filters. Admin access required.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string', enum: ['farmer', 'agronomist', 'admin', 'cooperative'] },
            description: 'Filter by user role',
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by active status',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by name or email',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
            description: 'Items per page',
          },
        ],
        responses: {
          200: {
            description: 'Users retrieved successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        users: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 50 },
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 10 },
                            pages: { type: 'integer', example: 5 },
                          },
                        },
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
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Returns a specific user by ID. Admin can view any user, others can only view their own profile.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID',
          },
        ],
        responses: {
          200: {
            description: 'User retrieved successfully.',
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
          403: { $ref: '#/components/responses/NotFoundError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user (Admin only)',
        description: 'Updates any user. Admin access required.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  location: { type: 'string' },
                  farmSize: { type: 'number' },
                  role: { type: 'string', enum: ['farmer', 'agronomist', 'admin', 'cooperative'] },
                  isActive: { type: 'boolean' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User updated successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/NotFoundError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (Admin only)',
        description: 'Permanently deletes a user. Admin access required. Cannot delete own account.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID',
          },
        ],
        responses: {
          200: {
            description: 'User deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User deleted successfully' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/NotFoundError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/NotFoundError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/users/farmers/all': {
      get: {
        tags: ['Users'],
        summary: 'Get all farmers',
        description: 'Returns a paginated list of farmers with optional filters.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'location',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by location (partial match)',
          },
          {
            name: 'minFarmSize',
            in: 'query',
            schema: { type: 'number' },
            description: 'Minimum farm size in hectares',
          },
          {
            name: 'maxFarmSize',
            in: 'query',
            schema: { type: 'number' },
            description: 'Maximum farm size in hectares',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
            description: 'Items per page',
          },
        ],
        responses: {
          200: {
            description: 'Farmers retrieved successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        farmers: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 30 },
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 10 },
                            pages: { type: 'integer', example: 3 },
                          },
                        },
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
    '/api/users/farmers/stats': {
      get: {
        tags: ['Users'],
        summary: 'Get current farmer stats',
        description: 'Returns statistics for the authenticated farmer.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Farmer stats retrieved successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        profile: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            location: { type: 'string' },
                            farmSize: { type: 'number' },
                          },
                        },
                        crops: { type: 'integer', example: 5 },
                        diseases: { type: 'integer', example: 2 },
                        soilTests: { type: 'integer', example: 3 },
                        coursesCompleted: { type: 'integer', example: 4 },
                        lastActivity: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/users/farmers/{id}/stats': {
      get: {
        tags: ['Users'],
        summary: 'Get farmer stats by ID',
        description: 'Returns statistics for a specific farmer.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Farmer ID',
          },
        ],
        responses: {
          200: {
            description: 'Farmer stats retrieved successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        profile: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            location: { type: 'string' },
                            farmSize: { type: 'number' },
                          },
                        },
                        crops: { type: 'integer', example: 5 },
                        diseases: { type: 'integer', example: 2 },
                        soilTests: { type: 'integer', example: 3 },
                        coursesCompleted: { type: 'integer', example: 4 },
                        lastActivity: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
  },
};
