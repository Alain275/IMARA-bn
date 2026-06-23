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
      url: 'https://imara-bn.onrender.com',
      description: 'Production server',
    }, 
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management' },
    { name: 'Crops', description: 'Crop information and recommendations' },
    { name: 'Weather', description: 'Weather forecasts and alerts' },
    { name: 'Soil', description: 'Soil analysis and recommendations' },
    { name: 'Disease', description: 'Disease detection and management' },
    { name: 'Market', description: 'Market prices and trends' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Agronomists', description: 'Agronomist services and management' },
    { name: 'Questions', description: 'Farmer questions and answers' },
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
      Crop: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          scientificName: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          growthPeriod: { type: 'integer' },
          waterNeed: { type: 'string', enum: ['low', 'medium', 'high'] },
          soilType: { type: 'string' },
          optimalTemp: { type: 'string' },
          season: { type: 'string' },
        },
      },
      SoilTest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          ph: { type: 'number' },
          nitrogen: { type: 'number' },
          phosphorus: { type: 'number' },
          potassium: { type: 'number' },
          organicMatter: { type: 'number' },
          texture: { type: 'string' },
          location: { type: 'string' },
          testDate: { type: 'string', format: 'date-time' },
        },
      },
      DiseaseDetection: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          cropId: { type: 'string', format: 'uuid' },
          diseaseName: { type: 'string' },
          confidence: { type: 'number' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          imageUrl: { type: 'string' },
          symptoms: { type: 'string' },
          treatment: { type: 'string' },
          prevention: { type: 'string' },
          detectedAt: { type: 'string', format: 'date-time' },
        },
      },
      MarketPrice: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          cropId: { type: 'string', format: 'uuid' },
          market: { type: 'string' },
          location: { type: 'string' },
          price: { type: 'number' },
          unit: { type: 'string' },
          currency: { type: 'string' },
          priceDate: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['weather', 'market', 'disease', 'soil', 'training', 'system'] },
          title: { type: 'string' },
          message: { type: 'string' },
          isRead: { type: 'boolean' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
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
    // Crops APIs
    '/api/crops/catalog': {
      get: {
        tags: ['Crops'],
        summary: 'Get all crops catalog',
        description: 'Returns a paginated list of all available crops with filters.',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
          { name: 'waterNeed', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          { name: 'season', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Crops retrieved successfully',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } } } }
          }
        }
      }
    },
    '/api/crops/recommendations': {
      get: {
        tags: ['Crops'],
        summary: 'Get crop recommendations',
        description: 'Get AI-powered crop recommendations based on location and conditions.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'soilType', in: 'query', schema: { type: 'string' } },
          { name: 'season', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Recommendations retrieved' } }
      }
    },
    '/api/crops/my-crops': {
      get: {
        tags: ['Crops'],
        summary: 'Get farmer crops',
        description: 'Returns the authenticated farmer\'s crops.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['planned', 'planted', 'growing', 'harvested', 'failed'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Crops retrieved successfully' } }
      },
      post: {
        tags: ['Crops'],
        summary: 'Add crop to farm',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cropId', 'plantingDate', 'areaPlanted'],
                properties: {
                  cropId: { type: 'string', format: 'uuid' },
                  farmId: { type: 'string', format: 'uuid' },
                  plantingDate: { type: 'string', format: 'date' },
                  areaPlanted: { type: 'number' },
                  expectedHarvestDate: { type: 'string', format: 'date' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Crop added successfully' } }
      }
    },
    '/api/crops/my-crops/{id}': {
      patch: {
        tags: ['Crops'],
        summary: 'Update farmer crop',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['planned', 'planted', 'growing', 'harvested', 'failed'] },
                  actualHarvestDate: { type: 'string', format: 'date' },
                  yield: { type: 'number' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Crop updated successfully' } }
      },
      delete: {
        tags: ['Crops'],
        summary: 'Delete farmer crop',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Crop deleted successfully' } }
      }
    },
    // Weather APIs
    '/api/weather/current': {
      get: {
        tags: ['Weather'],
        summary: 'Get current weather',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string', default: 'Kigali' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lon', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'Current weather retrieved' } }
      }
    },
    '/api/weather/hourly': {
      get: {
        tags: ['Weather'],
        summary: 'Get hourly forecast',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'hours', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: { 200: { description: 'Hourly forecast retrieved' } }
      }
    },
    '/api/weather/daily': {
      get: {
        tags: ['Weather'],
        summary: 'Get daily forecast',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
        ],
        responses: { 200: { description: 'Daily forecast retrieved' } }
      }
    },
    '/api/weather/alerts': {
      get: {
        tags: ['Weather'],
        summary: 'Get farming alerts',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'location', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Weather alerts retrieved' } }
      }
    },
    '/api/weather/rainfall': {
      get: {
        tags: ['Weather'],
        summary: 'Get rainfall history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'months', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: { 200: { description: 'Rainfall history retrieved' } }
      }
    },
    // Soil APIs
    '/api/soil': {
      get: {
        tags: ['Soil'],
        summary: 'Get soil tests',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Soil tests retrieved' } }
      },
      post: {
        tags: ['Soil'],
        summary: 'Create soil test',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ph', 'nitrogen', 'phosphorus', 'potassium'],
                properties: {
                  ph: { type: 'number' },
                  nitrogen: { type: 'number' },
                  phosphorus: { type: 'number' },
                  potassium: { type: 'number' },
                  organicMatter: { type: 'number' },
                  texture: { type: 'string' },
                  location: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Soil test created' } }
      }
    },
    '/api/soil/latest': {
      get: {
        tags: ['Soil'],
        summary: 'Get latest soil test',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Latest soil test retrieved' } }
      }
    },
    '/api/soil/analysis': {
      get: {
        tags: ['Soil'],
        summary: 'Get soil analysis',
        description: 'Get comprehensive soil analysis with health score and recommendations.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Soil analysis retrieved' } }
      }
    },
    '/api/soil/{id}': {
      get: {
        tags: ['Soil'],
        summary: 'Get soil test by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Soil test retrieved' } }
      },
      patch: {
        tags: ['Soil'],
        summary: 'Update soil test',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ph: { type: 'number' },
                  nitrogen: { type: 'number' },
                  phosphorus: { type: 'number' },
                  potassium: { type: 'number' },
                  organicMatter: { type: 'number' },
                  texture: { type: 'string' },
                  location: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Soil test updated' } }
      },
      delete: {
        tags: ['Soil'],
        summary: 'Delete soil test',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Soil test deleted' } }
      }
    },
    // Disease APIs
    '/api/disease': {
      get: {
        tags: ['Disease'],
        summary: 'Get disease detections',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          { name: 'cropId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Disease detections retrieved' } }
      },
      post: {
        tags: ['Disease'],
        summary: 'Create disease detection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['diseaseName', 'severity'],
                properties: {
                  cropId: { type: 'string', format: 'uuid' },
                  diseaseName: { type: 'string' },
                  confidence: { type: 'number' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  imageUrl: { type: 'string' },
                  symptoms: { type: 'string' },
                  treatment: { type: 'string' },
                  prevention: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Disease detection created' } }
      }
    },
    '/api/disease/stats': {
      get: {
        tags: ['Disease'],
        summary: 'Get disease statistics',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Disease stats retrieved' } }
      }
    },
    '/api/disease/detect': {
      post: {
        tags: ['Disease'],
        summary: 'Detect disease from image (AI)',
        description: 'AI-powered disease detection from image (placeholder).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['imageUrl'],
                properties: {
                  imageUrl: { type: 'string' },
                  cropId: { type: 'string', format: 'uuid' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Disease detected' } }
      }
    },
    '/api/disease/{id}': {
      get: {
        tags: ['Disease'],
        summary: 'Get disease detection by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Disease detection retrieved' } }
      },
      patch: {
        tags: ['Disease'],
        summary: 'Update disease detection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  symptoms: { type: 'string' },
                  treatment: { type: 'string' },
                  prevention: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Disease detection updated' } }
      },
      delete: {
        tags: ['Disease'],
        summary: 'Delete disease detection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Disease detection deleted' } }
      }
    },
    // Market APIs
    '/api/market/prices': {
      get: {
        tags: ['Market'],
        summary: 'Get market prices',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'cropId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'market', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Market prices retrieved' } }
      },
      post: {
        tags: ['Market'],
        summary: 'Add market price (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cropId', 'market', 'location', 'price', 'unit'],
                properties: {
                  cropId: { type: 'string', format: 'uuid' },
                  market: { type: 'string' },
                  location: { type: 'string' },
                  price: { type: 'number' },
                  unit: { type: 'string' },
                  volume: { type: 'number' },
                  quality: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Market price added' } }
      }
    },
    '/api/market/trends': {
      get: {
        tags: ['Market'],
        summary: 'Get price trends',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'cropId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: { 200: { description: 'Price trends retrieved' } }
      }
    },
    '/api/market/summary': {
      get: {
        tags: ['Market'],
        summary: 'Get market summary',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'location', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Market summary retrieved' } }
      }
    },
    '/api/market/alerts': {
      get: {
        tags: ['Market'],
        summary: 'Get price alerts',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Price alerts retrieved' } }
      }
    },
    '/api/market/prices/{id}': {
      get: {
        tags: ['Market'],
        summary: 'Get price by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Price retrieved' } }
      },
      patch: {
        tags: ['Market'],
        summary: 'Update market price',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  volume: { type: 'number' },
                  quality: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Price updated' } }
      },
      delete: {
        tags: ['Market'],
        summary: 'Delete market price',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Price deleted' } }
      }
    },
    // Notifications APIs
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notifications',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['weather', 'market', 'disease', 'soil', 'training', 'system'] } },
          { name: 'isRead', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Notifications retrieved' } }
      }
    },
    '/api/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get unread count',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Unread count retrieved' } }
      }
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Notification marked as read' } }
      }
    },
    '/api/notifications/mark-all-read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all as read',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All notifications marked as read' } }
      }
    },
    '/api/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete notification',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Notification deleted' } }
      }
    },
    // Agronomist APIs
    '/api/agronomists/profile': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get agronomist profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Profile retrieved' } }
      },
      patch: {
        tags: ['Agronomists'],
        summary: 'Update agronomist profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  district: { type: 'string', example: 'Gasabo' },
                  sector: { type: 'string', example: 'Remera' },
                  specialization: { type: 'string', example: 'Crop Management' },
                  yearsOfExperience: { type: 'integer', example: 5 },
                  bio: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Profile updated' } }
      }
    },
    '/api/agronomists/farmers': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get assigned farmers',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'district', in: 'query', schema: { type: 'string' } },
          { name: 'sector', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Farmers list retrieved' } }
      }
    },
    '/api/agronomists/farmers/{farmerId}': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get farmer details',
        description: 'Get detailed farmer information including farms and crops.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'farmerId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Farmer details retrieved' } }
      }
    },
    '/api/agronomists/farm-visits': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get farm visits',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'completed', 'cancelled'] } },
          { name: 'farmerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Farm visits retrieved' } }
      },
      post: {
        tags: ['Agronomists'],
        summary: 'Create farm visit',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['farmerId', 'visitDate', 'observations', 'recommendations'],
                properties: {
                  farmerId: { type: 'string', format: 'uuid' },
                  farmId: { type: 'string', format: 'uuid' },
                  visitDate: { type: 'string', format: 'date-time' },
                  observations: { type: 'string' },
                  recommendations: { type: 'string' },
                  nextVisitDate: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Farm visit created' } }
      }
    },
    '/api/agronomists/farm-visits/{id}': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get farm visit by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Farm visit retrieved' } }
      },
      patch: {
        tags: ['Agronomists'],
        summary: 'Update farm visit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  visitDate: { type: 'string', format: 'date-time' },
                  observations: { type: 'string' },
                  recommendations: { type: 'string' },
                  nextVisitDate: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled'] }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Farm visit updated' } }
      }
    },
    '/api/agronomists/advice': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get advice list',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'in_progress', 'resolved', 'closed'] } },
          { name: 'farmerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Advice list retrieved' } }
      },
      post: {
        tags: ['Agronomists'],
        summary: 'Create advice',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['farmerId', 'title', 'problem', 'recommendation'],
                properties: {
                  farmerId: { type: 'string', format: 'uuid' },
                  farmId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', example: 'Pest Control Issue' },
                  problem: { type: 'string', example: 'Aphids on tomato plants' },
                  recommendation: { type: 'string', example: 'Apply neem oil spray twice daily' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Advice created' } }
      }
    },
    '/api/agronomists/advice/{id}': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get advice by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Advice retrieved' } }
      },
      patch: {
        tags: ['Agronomists'],
        summary: 'Update advice',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  problem: { type: 'string' },
                  recommendation: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'in_progress', 'resolved', 'closed'] }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Advice updated' } }
      },
      delete: {
        tags: ['Agronomists'],
        summary: 'Delete advice',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Advice deleted' } }
      }
    },
    '/api/agronomists/questions': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get all questions (Agronomist view)',
        description: 'Agronomists can see all pending questions from farmers.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'answered', 'closed'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Questions retrieved' } }
      }
    },
    '/api/agronomists/questions/{id}/answer': {
      patch: {
        tags: ['Agronomists'],
        summary: 'Answer a question',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['answer'],
                properties: {
                  answer: { type: 'string', example: 'For maize cultivation, use NPK fertilizer at planting time...' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Question answered' } }
      }
    },
    '/api/agronomists/training-materials': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get training materials',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'language', in: 'query', schema: { type: 'string', example: 'en' } },
          { name: 'isPublished', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Training materials retrieved' } }
      },
      post: {
        tags: ['Agronomists'],
        summary: 'Create training material',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'category'],
                properties: {
                  title: { type: 'string', example: 'Introduction to Organic Farming' },
                  description: { type: 'string' },
                  content: { type: 'string' },
                  videoUrl: { type: 'string', format: 'uri' },
                  pdfUrl: { type: 'string', format: 'uri' },
                  category: { type: 'string', example: 'Crop Management' },
                  language: { type: 'string', default: 'en', example: 'en' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Training material created' } }
      }
    },
    '/api/agronomists/training-materials/{id}': {
      get: {
        tags: ['Agronomists'],
        summary: 'Get training material by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Training material retrieved' } }
      },
      patch: {
        tags: ['Agronomists'],
        summary: 'Update training material',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  content: { type: 'string' },
                  videoUrl: { type: 'string', format: 'uri' },
                  pdfUrl: { type: 'string', format: 'uri' },
                  category: { type: 'string' },
                  language: { type: 'string' },
                  isPublished: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Training material updated' } }
      },
      delete: {
        tags: ['Agronomists'],
        summary: 'Delete training material',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Training material deleted' } }
      }
    },
    // Farmer Questions APIs
    '/api/questions': {
      get: {
        tags: ['Questions'],
        summary: 'Get my questions (Farmer)',
        description: 'Farmers can see their own questions.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'answered', 'closed'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Questions retrieved' } }
      },
      post: {
        tags: ['Questions'],
        summary: 'Ask a question (Farmer)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['question'],
                properties: {
                  question: { type: 'string', example: 'What is the best fertilizer for maize?' },
                  category: { type: 'string', example: 'Crop Management' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Question submitted' } }
      }
    },
    '/api/questions/{id}': {
      get: {
        tags: ['Questions'],
        summary: 'Get question by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Question retrieved' } }
      }
    },
    // Disease Detection APIs
    '/api/disease': {
      get: {
        tags: ['Disease'],
        summary: 'Get all disease detections',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Detections retrieved' } }
      },
      post: {
        tags: ['Disease'],
        summary: 'Create manual disease detection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['diseaseName', 'severity'],
                properties: {
                  diseaseName: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  cropId: { type: 'string', format: 'uuid' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Detection created' } }
      }
    },
    '/api/disease/stats': {
      get: {
        tags: ['Disease'],
        summary: 'Get disease statistics',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Statistics retrieved' } }
      }
    },
    '/api/disease/detect': {
      post: {
        tags: ['Disease'],
        summary: 'Detect disease from image (Farmer)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Plant image' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Disease detection started' } }
      }
    },
    '/api/disease/my-detections': {
      get: {
        tags: ['Disease'],
        summary: 'Get my disease detections (Farmer)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Detections retrieved' } }
      }
    },
    '/api/disease/pending': {
      get: {
        tags: ['Disease'],
        summary: 'Get pending disease detections (Agronomist/Admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Pending detections retrieved' } }
      }
    },
    '/api/disease/{id}': {
      get: {
        tags: ['Disease'],
        summary: 'Get disease detection by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Detection retrieved' } }
      },
      patch: {
        tags: ['Disease'],
        summary: 'Update disease detection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  symptoms: { type: 'string' },
                  treatment: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Detection updated' } }
      },
      delete: {
        tags: ['Disease'],
        summary: 'Delete disease detection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Detection deleted' } }
      }
    },
    '/api/disease/{id}/verify': {
      patch: {
        tags: ['Disease'],
        summary: 'Verify AI disease detection (Agronomist/Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['verified', 'rejected'] },
                  verifiedDisease: { type: 'string' },
                  verifiedTreatment: { type: 'string' },
                  agronomistComment: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Detection verified' } }
      }
    },
    // Farm Management APIs
    '/api/farms': {
      post: {
        tags: ['Farms'],
        summary: 'Register a new farm',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Farm registered successfully' } }
      },
      get: {
        tags: ['Farms'],
        summary: 'Get all user farms',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Farms retrieved successfully' } }
      }
    },
  },
};
