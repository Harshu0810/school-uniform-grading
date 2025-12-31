// ============================================================================
// FILE: pages/Student/Dashboard.jsx - COMPLETE FIX FOR PAGE RELOAD ISSUE
// ============================================================================
// The problem: Visiting same page twice doesn't reload data
// The cause: useEffect dependency array issues + state not resetting

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Navbar from '../../components/Common/Navbar';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  
  const [latestGrade, setLatestGrade] = useState(null);
  const [gradeCount, setGradeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // MAIN FIX: Fetch on component mount AND when user changes
  useEffect(() => {
    // Reset state when component mounts or user changes
    setLatestGrade(null);
    setGradeCount(0);
    setError('');

    // Don't fetch if user not logged in
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let abortController = new AbortController();

    const fetchLatestGrade = async () => {
      try {
        setLoading(true);
        setError('');

        // Small delay to ensure auth is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Fetch latest grade
        const { data, error: fetchError } = await supabase
          .from('grades')
          .select(
            `
            id,
            final_grade,
            final_score,
            graded_at,
            photo_url,
            grading_breakdown(
              shirt_score,
              pant_score,
              shoes_score,
              grooming_score,
              cleanliness_score
            )
          `
          )
          .eq('user_id', user.id)
          .order('graded_at', { ascending: false })
          .limit(1);

        if (abortController.signal.aborted) return;

        if (fetchError) throw fetchError;

        if (isMounted) {
          if (data && data.length > 0) {
            setLatestGrade(data[0]);
          } else {
            setLatestGrade(null);
          }
        }

        // Fetch grade count
        const { count, error: countError } = await supabase
          .from('grades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (abortController.signal.aborted) return;

        if (!countError && isMounted) {
          setGradeCount(count || 0);
        }
      } catch (err) {
        if (isMounted && !abortController.signal.aborted) {
          setError('Failed to load grades');
          console.error('Dashboard fetch error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLatestGrade();

    // Cleanup
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]); // Run when user changes

  // Render functions...
  const getGradeColor = (grade) => {
    const colors = {
      A: 'text-green-600 bg-green-50',
      B: 'text-blue-600 bg-blue-50',
      C: 'text-yellow-600 bg-yellow-50',
      D: 'text-orange-600 bg-orange-50',
      F: 'text-red-600 bg-red-50',
    };
    return colors[grade] || 'text-gray-600 bg-gray-50';
  };

  const getGradeMessage = (grade) => {
    const messages = {
      A: 'Excellent! Keep up the great work! 🎉',
      B: 'Very good! You can do even better.',
      C: 'Good effort. Keep improving! 💪',
      D: 'You need to improve your uniform standards.',
      F: 'Please correct your uniform and try again.',
    };
    return messages[grade] || 'Check your grade';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome, {userData?.full_name || 'Student'}! 👋
          </h1>
          <p className="text-gray-600">
            Class {userData?.class} | Section {userData?.section} | Roll {userData?.roll_number}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upload Photo Card */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Upload Photo</h3>
                <p className="text-gray-600 text-sm">Get your uniform graded</p>
              </div>
              <button
                onClick={() => navigate('/upload-photo')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                Upload
              </button>
            </div>
          </div>

          {/* Grade History Card */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Grade History</h3>
                <p className="text-gray-600 text-sm">View your {gradeCount} grade(s)</p>
              </div>
              <button
                onClick={() => navigate('/grade-history')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                View
              </button>
            </div>
          </div>
        </div>

        {/* Latest Grade Section */}
        {latestGrade ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Latest Grade</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Grade Card */}
              <div className={`flex flex-col items-center justify-center p-6 rounded-lg ${getGradeColor(latestGrade.final_grade)}`}>
                <div className="text-6xl font-bold mb-2">{latestGrade.final_grade}</div>
                <div className="text-2xl font-semibold mb-2">{latestGrade.final_score}/100</div>
                <p className="text-sm text-center">{getGradeMessage(latestGrade.final_grade)}</p>
              </div>

              {/* Component Scores */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">Score Breakdown</h3>
                {latestGrade.grading_breakdown && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">👕 Shirt</span>
                      <span className="font-semibold text-gray-800">
                        {latestGrade.grading_breakdown.shirt_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">👖 Pants</span>
                      <span className="font-semibold text-gray-800">
                        {latestGrade.grading_breakdown.pant_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">👞 Shoes</span>
                      <span className="font-semibold text-gray-800">
                        {latestGrade.grading_breakdown.shoes_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">💇 Grooming</span>
                      <span className="font-semibold text-gray-800">
                        {latestGrade.grading_breakdown.grooming_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">✨ Cleanliness</span>
                      <span className="font-semibold text-gray-800">
                        {latestGrade.grading_breakdown.cleanliness_score}/100
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Photo Preview */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Photo</h3>
                {latestGrade.photo_url ? (
                  <img
                    src={latestGrade.photo_url}
                    alt="Uniform photo"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No photo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Graded Date */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Graded on: {new Date(latestGrade.graded_at).toLocaleDateString()} at{' '}
                {new Date(latestGrade.graded_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No grades yet. Upload a photo to get started!</p>
            <button
              onClick={() => navigate('/upload-photo')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            >
              Upload Your First Photo
            </button>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Tips for Better Grades</h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>✓ Wear clean and well-ironed uniform</li>
            <li>✓ Ensure shoes are clean and polished</li>
            <li>✓ Keep your hair neat and tidy</li>
            <li>✓ Overall cleanliness and appearance matters</li>
            <li>✓ Take photos in good lighting for better results</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
