# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (should be v18+)
node --version

# Check PostgreSQL (should be 12+)
psql --version

# Check npm
npm --version
```

If any are missing, install them first (see main README).

## Setup Steps

### 1. Setup PostgreSQL Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE teacher_assessment;

# Exit
\q
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
# Change "your_password" to your actual PostgreSQL password
nano .env.local
```

Example `.env.local`:
```env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/teacher_assessment
```

### 3. Install & Setup

```bash
# Install dependencies
npm install

# Setup database tables
npm run db:setup

# Start development server
npm run dev
```

### 4. Open Browser

Visit: **http://localhost:3000**

## That's It!

You should now see the teacher assessment system running.

## First Steps in the App

1. Click "➕ Tambah Murid" to add a student
2. Fill in the student details
3. Click "Simpan" to save
4. Click the TP buttons to rate the student
5. Go to "📊 Dashboard Analisis" to see statistics

## Common Issues

**Can't connect to database?**
```bash
# Make sure PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Port 3000 in use?**
```bash
# Use a different port
npm run dev -- -p 3001
```

**Database setup fails?**
- Check PostgreSQL password in `.env.local`
- Make sure database exists: `sudo -u postgres psql -c "\l"`
- Check user permissions

## Next Steps

- Read the full README.md for detailed documentation
- Explore the API documentation
- Learn about deployment options
- Add your own customizations

## Need Help?

Check the main README.md file for:
- Detailed installation instructions
- API documentation
- Troubleshooting guide
- Deployment options
