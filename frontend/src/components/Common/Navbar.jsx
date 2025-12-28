// components/Common/Navbar.jsx
// Navigation bar for authenticated users

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, userData, isStudent, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button
            onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
            className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition"
          >
            📚 Uniform Grader
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {isStudent && (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/upload-photo')}
                  className="text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Upload Photo
                </button>
                <button
                  onClick={() => navigate('/grade-history')}
                  className="text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  History
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Students
                </button>
                <button
                  onClick={() => navigate('/admin/analytics')}
                  className="text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  Analytics
                </button>
              </>
            )}

            {/* User Info & Logout */}
            <div className="flex items-center gap-4 border-l border-gray-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  {userData?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-600">{isStudent ? 'Student' : 'Admin'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-700 hover:text-indigo-600 text-2xl"
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 mt-4 pt-4 space-y-3">
            {isStudent && (
              <>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate('/upload-photo');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  Upload Photo
                </button>
                <button
                  onClick={() => {
                    navigate('/grade-history');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  History
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    navigate('/admin');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  Students
                </button>
                <button
                  onClick={() => {
                    navigate('/admin/analytics');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  Analytics
                </button>
              </>
            )}

            <div className="pt-4 border-t border-gray-200 space-y-3">
              <p className="px-4 text-sm font-medium text-gray-800">
                {userData?.full_name || user?.email}
              </p>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
