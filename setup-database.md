# Database Setup Guide

## PostgreSQL Installation

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the wizard
3. Remember the password you set for the `postgres` user
4. Default port is 5432

### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Create Database

1. Connect to PostgreSQL:
```bash
psql -U postgres
```

2. Create the database:
```sql
CREATE DATABASE imara_db;
```

3. Create a user (optional):
```sql
CREATE USER imara_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE imara_db TO imara_user;
```

4. Exit psql:
```sql
\q
```

## Configure Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the database configuration in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=imara_db
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=generate-a-strong-secret-here
```

## Install Dependencies

```bash
npm install
```

## Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

The server will:
- Connect to PostgreSQL
- Automatically create/update tables based on models
- Start listening on port 5000

## Models Created

The following tables will be automatically created:

- **users** - User accounts (farmers, agronomists, admins)
- **crops** - Crop information database
- **soil_tests** - Soil analysis records
- **disease_detections** - Disease detection history
- **courses** - Training courses
- **enrollments** - User course enrollments

## Verify Database

Connect to PostgreSQL and check tables:

```bash
psql -U postgres -d imara_db
```

```sql
\dt  -- List all tables
SELECT * FROM users LIMIT 5;  -- View users
```

## Troubleshooting

### Connection Refused
- Make sure PostgreSQL is running
- Check if port 5432 is correct
- Verify username and password

### Authentication Failed
- Double-check DB_USER and DB_PASSWORD in .env
- Ensure the user has privileges on the database

### Tables Not Created
- Check server logs for errors
- Ensure NODE_ENV is set to 'development' for auto-sync
- Manually sync: Add `await sequelize.sync({ force: true })` temporarily
