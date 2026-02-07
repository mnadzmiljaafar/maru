# Sistem Pengurusan Penilaian Murid - Next.js + PostgreSQL

A modern, full-stack web application for teacher assessment management built with Next.js and PostgreSQL.

## 🌟 Features

### Page 1: Student Assessment Form (Borang Rekod)
- ➕ **Add Student Records**: Add student name, date, teacher name, subject/theme, and class
- 🔍 **Advanced Filtering**: Filter records by date, teacher name, subject, and class
- 📊 **Rating System**: Track 7 levels of mastery (TP1-TP6 + TD - Tidak Dinilai)
- 📥 **CSV Export**: Export filtered data to CSV format
- 🎨 **Interactive Table**: Click to select/deselect performance levels
- 💾 **Persistent Storage**: All data saved in PostgreSQL database
- 🔄 **Real-time Updates**: Instant database synchronization

### Page 2: Analytics Dashboard (Dashboard Analisis)
- 📈 **Key Metrics**: Total students, average ratings, number of subjects and teachers
- 📊 **Performance Distribution**: Visual bar chart showing distribution across TP levels
- 📚 **Subject Analysis**: Bar chart showing assessments by subject/theme
- 👥 **Teacher Analysis**: Statistics by teacher
- 🎯 **Real-time Analytics**: All statistics update automatically based on filters

## 🛠️ Technology Stack

### Open Source Technologies
- **Frontend Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Database Driver**: node-postgres (pg)
- **Styling**: CSS Modules with custom design
- **API**: Next.js API Routes (RESTful)

### Architecture
- **Client-Side Rendering**: React components with hooks
- **Server-Side**: Next.js API routes
- **Database**: PostgreSQL with indexed queries
- **RESTful API**: Full CRUD operations

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (version 18 or higher)
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **PostgreSQL** (version 12 or higher)
   ```bash
   psql --version  # Should be 12.0 or higher
   ```

3. **npm** or **yarn** (comes with Node.js)
   ```bash
   npm --version
   ```

## 🚀 Installation & Setup

### Step 1: Install PostgreSQL

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### On macOS (using Homebrew):
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### On Windows:
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### Step 2: Create Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE teacher_assessment;

# Create user (optional, if not using default postgres user)
CREATE USER your_username WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE teacher_assessment TO your_username;

# Exit
\q
```

### Step 3: Clone and Install Dependencies

```bash
# Navigate to the project directory
cd teacher-assessment-nextjs

# Install dependencies
npm install
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials:

```env
# Option 1: Using connection string (recommended)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/teacher_assessment

# Option 2: Using individual parameters
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teacher_assessment

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Setup Database Schema

Run the database setup script to create tables and indexes:

```bash
npm run db:setup
```

This will:
- Create the `students` table
- Create the `ratings` table
- Set up all necessary indexes
- Create triggers for automatic timestamp updates

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## 📁 Project Structure

```
teacher-assessment-nextjs/
├── app/
│   ├── api/
│   │   ├── students/
│   │   │   ├── route.ts          # GET, POST students
│   │   │   └── [id]/
│   │   │       └── route.ts      # PATCH, DELETE, PUT student
│   │   ├── analytics/
│   │   │   └── route.ts          # GET analytics
│   │   └── export/
│   │       └── csv/
│   │           └── route.ts      # Export CSV
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── lib/
│   └── db.ts                     # Database connection utility
├── scripts/
│   └── setup-db.js               # Database setup script
├── schema.sql                    # Database schema
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.js                # Next.js config
├── .env.example                  # Environment template
└── README.md                     # This file
```

## 🗄️ Database Schema

### Students Table
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(255) NOT NULL
date            DATE NOT NULL
teacher_name    VARCHAR(255)
subject         VARCHAR(255)
class           VARCHAR(100)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Ratings Table
```sql
id              SERIAL PRIMARY KEY
student_id      INTEGER REFERENCES students(id)
rating_type     VARCHAR(10) (TP1-TP6, TD)
is_selected     BOOLEAN
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Indexes
- `idx_students_date` - Fast date filtering
- `idx_students_teacher` - Teacher name searches
- `idx_students_subject` - Subject filtering
- `idx_students_class` - Class filtering
- `idx_ratings_student_id` - Rating lookups
- `idx_ratings_type` - Rating type queries

## 📚 API Documentation

### Students API

#### GET /api/students
Get all students with optional filters.

**Query Parameters:**
- `date` - Filter by date (YYYY-MM-DD)
- `teacher` - Filter by teacher name (partial match)
- `subject` - Filter by subject (partial match)
- `class` - Filter by class (partial match)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ahmad bin Ali",
      "date": "2024-01-24",
      "teacher_name": "YANI",
      "subject": "KEKELUARGAAN",
      "class": "1 TERBILANG",
      "ratings": [
        {"rating_type": "TP3", "is_selected": true},
        {"rating_type": "TP4", "is_selected": false}
      ]
    }
  ],
  "count": 1
}
```

#### POST /api/students
Create a new student record.

**Request Body:**
```json
{
  "name": "Student Name",
  "date": "2024-01-24",
  "teacher_name": "Teacher Name",
  "subject": "Subject",
  "class": "Class Name",
  "ratings": {
    "TP1": false,
    "TP2": false,
    "TP3": true,
    "TP4": false
  }
}
```

#### PATCH /api/students/[id]
Update a student's rating.

**Request Body:**
```json
{
  "rating_type": "TP3",
  "is_selected": true
}
```

#### PUT /api/students/[id]
Update student information.

#### DELETE /api/students/[id]
Delete a student record (cascade deletes ratings).

### Analytics API

#### GET /api/analytics
Get statistics and analytics data.

**Query Parameters:** Same as students API

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 25,
    "averageRatings": "3.2",
    "uniqueSubjects": 5,
    "uniqueTeachers": 3,
    "ratingDistribution": {
      "TP1": 5,
      "TP2": 8,
      "TP3": 12,
      ...
    },
    "bySubject": {
      "KEKELUARGAAN": 10,
      "MATEMATIK": 15
    }
  }
}
```

### Export API

#### GET /api/export/csv
Export filtered data as CSV file.

**Query Parameters:** Same as students API

## 🎨 Performance Level Guide

| Level | Color | Meaning |
|-------|-------|---------|
| TP1 | 🔴 Red | Tahap Penguasaan 1 (Lowest) |
| TP2 | 🟠 Orange | Tahap Penguasaan 2 |
| TP3 | 🟡 Yellow | Tahap Penguasaan 3 |
| TP4 | 🟢 Light Green | Tahap Penguasaan 4 |
| TP5 | 🟢 Green | Tahap Penguasaan 5 |
| TP6 | 🔵 Cyan | Tahap Penguasaan 6 (Highest) |
| TD | 🟣 Purple | Tidak Dinilai (Not Assessed) |

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Database Management

#### View tables:
```bash
psql -U postgres -d teacher_assessment -c "\dt"
```

#### View data:
```bash
psql -U postgres -d teacher_assessment -c "SELECT * FROM students;"
```

#### Reset database:
```bash
psql -U postgres -d teacher_assessment -c "DROP TABLE IF EXISTS ratings CASCADE; DROP TABLE IF EXISTS students CASCADE;"
npm run db:setup
```

## 🚀 Deployment

### Option 1: Vercel (Recommended for Next.js)

1. **Setup PostgreSQL Database**
   - Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - Or [Railway](https://railway.app/)
   - Or [Supabase](https://supabase.com/)

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard**
   - Add `DATABASE_URL`

4. **Run Database Migration**
   - Connect to your production database
   - Run the SQL from `schema.sql`

### Option 2: Railway

1. Create new project on [Railway](https://railway.app/)
2. Add PostgreSQL database service
3. Deploy from GitHub
4. Set environment variables
5. Run database setup

### Option 3: Traditional Server (Ubuntu/Linux)

1. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install nodejs npm postgresql nginx
   ```

2. **Setup PostgreSQL**
   ```bash
   sudo -u postgres createdb teacher_assessment
   ```

3. **Clone and Build**
   ```bash
   git clone <repository>
   cd teacher-assessment-nextjs
   npm install
   npm run build
   ```

4. **Setup PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "teacher-app" -- start
   pm2 startup
   pm2 save
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🐛 Troubleshooting

### Database Connection Issues

**Error: "connection refused"**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

**Error: "authentication failed"**
- Check username and password in `.env.local`
- Verify user exists: `psql -U postgres -c "\du"`

**Error: "database does not exist"**
```bash
sudo -u postgres createdb teacher_assessment
```

### Common Issues

**Port 3000 already in use:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

**Module not found errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📊 Performance Optimization

The application includes several optimizations:

1. **Database Indexes**: All filterable columns are indexed
2. **Connection Pooling**: Reuses database connections
3. **Efficient Queries**: Uses JOIN and aggregation functions
4. **CSS Animations**: GPU-accelerated transitions
5. **Code Splitting**: Next.js automatic code splitting

## 🔐 Security Features

- SQL injection prevention (parameterized queries)
- Input validation on server-side
- CORS configuration
- Environment variable protection
- No sensitive data in client-side code

## 📱 Mobile Responsive

The application is fully responsive and works on:
- 📱 Mobile phones (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1440px+)

## 🤝 Contributing

Suggested improvements:
1. Add user authentication
2. Add role-based access control
3. Add data import from Excel/CSV
4. Add PDF export
5. Add email notifications
6. Add progress tracking charts
7. Add bulk operations

## 📝 License

This project is open source and free to use for educational purposes.

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check database connection
4. Verify environment variables

## 🎓 Educational Context

Designed for Malaysian education with:
- Bahasa Malaysia interface
- Tahap Penguasaan (TP) assessment levels
- Flexible subject/theme tracking
- Class-based organization

---

**Built with ❤️ using Next.js and PostgreSQL**
