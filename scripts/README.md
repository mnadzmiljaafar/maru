# Database Scripts

## Important Scripts

### **setup-db.js** ⭐
- Initializes the PostgreSQL database schema
- **Use when:** Setting up the project for the first time or resetting the database
```bash
npm run db:setup
```

### **add-sample-data.js**
- Adds 6 test students with ratings for development/testing
- **Use when:** You want sample data to test with
```bash
node scripts/add-sample-data.js
```

### **verify-db.js**
- Shows current database status and contents
- **Use when:** You want to check what's in the database
```bash
node scripts/verify-db.js
```

## Workflow

### First Time Setup
```bash
# 1. Setup database schema
npm run db:setup

# 2. Add sample data (optional)
node scripts/add-sample-data.js

# 3. Verify everything is working
node scripts/verify-db.js

# 4. Start the app
npm run dev
```

### To Reset Everything
```bash
npm run db:setup      # Recreates schema
node scripts/add-sample-data.js  # Repopulates test data
node scripts/verify-db.js        # Verify
npm run dev
```
