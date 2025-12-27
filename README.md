# 📚 School Uniform Grader

A modern web application that uses AI-powered image analysis to automatically grade school uniforms. Students upload photos of their uniforms and receive instant feedback on various aspects including shirt condition, pants fit, shoe polish, grooming, and overall cleanliness.

## 🚀 Features

### For Students
- **User Authentication**: Secure signup and login with email verification
- **Profile Management**: Complete profile with class, section, and roll number
- **Photo Upload**: Take or upload uniform photos
- **Instant Grading**: AI-powered analysis with component-wise breakdown
- **Grade History**: Track grading history with detailed feedback
- **Progress Tracking**: View improvements over time

### For Admins
- **Student Management**: View all students with filtering options
- **Search & Filter**: Search by name/roll number, filter by grade/class/section
- **Analytics Dashboard**: Comprehensive charts and statistics
  - Grade distribution (pie chart)
  - Daily/weekly trends (line charts)
  - Class-wise performance (tables)
  - Top performers and students needing help
- **Performance Monitoring**: Track grading trends

## 🛠️ Tech Stack

- **Frontend**: React 18.2, React Router 6, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **Charts**: Recharts
- **Image Analysis**: Canvas-based rule engine (no paid APIs)

## 📋 Requirements

- Node.js 16+
- npm or yarn
- Supabase account
- Vercel account (for deployment)
- GitHub account

## ⚙️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/school-uniform-grader.git
cd school-uniform-grader
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
Create `frontend/.env.local`:
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
REACT_APP_ENV=development
```

### 4. Run Locally
```bash
npm start
```

Visit: `http://localhost:3000`

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Set root directory to `frontend`
5. Add environment variables
6. Click "Deploy"

See `DEPLOYMENT.md` for detailed instructions.

## 📚 Usage

### For Students
1. Sign up with email
2. Verify email
3. Complete profile
4. Upload uniform photo
5. Receive instant grade with feedback
6. View grade history

### For Admins
1. Login with admin credentials
2. View student list with latest grades
3. Use filters and search
4. Check analytics dashboard
5. Monitor class performance trends

## 📊 Grading Criteria

Uniforms are graded on 5 components:
- **Shirt** (25%): Cleanliness, fit, color consistency
- **Pants** (25%): Condition, fit, ironing
- **Shoes** (20%): Cleanliness, polish, visibility
- **Grooming** (15%): Hair, facial grooming, neatness
- **Cleanliness** (15%): Overall appearance and hygiene

**Grades**: A (85-100), B (70-84), C (60-69), D (50-59), F (0-49)

## 🔒 Security

- Email verification required for signup
- Role-based access control (students vs admins)
- Row-level security (RLS) on all database tables
- Private photo storage with signed URLs
- No secrets stored in code or GitHub

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   ├── Student/
│   │   ├── Admin/
│   │   └── Common/
│   ├── services/
│   ├── utils/
│   ├── hooks/
│   ├── context/
│   ├── styles/
│   ├── App.jsx
│   └── index.js
├── public/
├── package.json
└── vercel.json
```

## 🤝 Contributing

1. Create a branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/YOUR_USERNAME/school-uniform-grader/issues)
- Email: support@school.com

## 👨‍💻 Author

Created for automating school uniform inspections.
