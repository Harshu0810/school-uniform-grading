import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">403</h1>
        <p className="text-2xl text-gray-600 mb-8">Access Denied</p>
        <p className="text-gray-500 mb-8 max-w-md">
          You don't have permission to access this page. Only administrators can access this area.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
