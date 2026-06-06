# IMARA Backend API

Backend API for the IMARA Agricultural Platform - Smart farming solutions for Rwanda.

## Features

- 🌾 **Crop Advisory** - AI-powered crop recommendations
- 🦠 **Disease Detection** - Plant disease identification
- ☁️ **Weather Intelligence** - Farming-specific weather forecasts
- 🌱 **Soil Analysis** - Comprehensive soil health assessments
- 📊 **Market Intelligence** - Real-time crop prices and trends
- 📚 **Training** - Educational courses for farmers
- 👤 **User Management** - Authentication and profiles

## Tech Stack

- Node.js + Express
- TypeScript
- JWT Authentication
- PostgreSQL (via Prisma - optional)
- RESTful API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Add JWT_SECRET and other required variables

# Run development server
npm run dev
```

The API will be available at `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Crops
- `GET /api/crops` - Get all crops
- `GET /api/crops/:id` - Get crop by ID
- `GET /api/crops/recommendations` - Get crop recommendations
- `GET /api/crops/calendar` - Get planting calendar
- `GET /api/crops/fertilizer` - Get fertilizer recommendations

### Disease Detection
- `POST /api/disease/detect` - Detect plant disease (upload image)
- `GET /api/disease/history` - Get detection history
- `GET /api/disease/database` - Browse disease database
- `GET /api/disease/:id` - Get disease details

### Weather
- `GET /api/weather/current` - Get current weather
- `GET /api/weather/hourly` - Get hourly forecast
- `GET /api/weather/weekly` - Get 7-day forecast
- `GET /api/weather/alerts` - Get farming alerts

### Soil Analysis
- `GET /api/soil/analysis` - Get soil analysis
- `GET /api/soil/suitability` - Get crop suitability
- `GET /api/soil/recommendations` - Get soil recommendations
- `POST /api/soil/test` - Submit soil test results

### Market Intelligence
- `GET /api/market/prices` - Get commodity prices
- `GET /api/market/history` - Get price history
- `GET /api/market/demand` - Get market demand
- `GET /api/market/buyers` - Get verified buyers

### Training
- `GET /api/training/courses` - Get all courses
- `GET /api/training/courses/:id` - Get course details
- `POST /api/training/courses/:id/enroll` - Enroll in course
- `GET /api/training/progress` - Get user progress
- `GET /api/training/achievements` - Get user achievements

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/settings` - Update settings
- `GET /api/users/stats` - Get user statistics

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT
