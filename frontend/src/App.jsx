// App.jsx
// Main app setup with routing

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/Common/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

// Student Pages
import StudentOnboarding from './pages/Student/Onboarding';
import StudentDashboard from './pages/Student/Dashboard';
import PhotoUploadPage from './pages/Student/PhotoUpload';
import GradeHistoryPage from './pages/Student/GradeHistory';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminAnalytics from './pages/Admin/Analytics';

// Common Pages
import NotFoundPage from './pages/NotFound';
import AccessDeniedPage from './pages/AccessDenied';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ==================== STUDENT ROUTES ==================== */}
          
          {/* Onboarding: Only for students without profile */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute
                element={<StudentOnboarding />}
                requiredRole="student"
              />
            }
          />

          {/* Dashboard: Main student page */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                element={<StudentDashboard />}
                requiredRole="student"
              />
            }
          />

          {/* Photo Upload & Grading */}
          <Route
            path="/upload-photo"
            element={
              <ProtectedRoute
                element={<PhotoUploadPage />}
                requiredRole="student"
              />
            }
          />

          {/* Grade History */}
          <Route
            path="/grade-history"
            element={
              <ProtectedRoute
                element={<GradeHistoryPage />}
                requiredRole="student"
              />
            }
          />

          {/* ==================== ADMIN ROUTES ==================== */}
          
          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                element={<AdminDashboard />}
                requiredRole="admin"
              />
            }
          />

          {/* Admin Analytics */}
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute
                element={<AdminAnalytics />}
                requiredRole="admin"
              />
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute
                element={<AdminAnalytics />}
                requiredRole="admin"/>
            }
            />
          {/* ==================== ERROR & FALLBACK ROUTES ==================== */}
          
          <Route path="/admin-denied" element={<AccessDeniedPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
