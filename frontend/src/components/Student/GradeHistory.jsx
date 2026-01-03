// pages/Student/GradeHistory.jsx
// View all grades and detailed breakdown for each

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Navbar from '../../components/Common/Navbar';

export default function GradeHistoryPage() {
  const { userData } = useAuth();
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
  // Reset state
  setGrades([]);
  setSelectedGrade(null);
  setError('');

  if (!userData?.id) {
    setLoading(false);
    return;
  }

  let isMounted = true;

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('grades')
        .select(
          `
          id,
          final_grade,
          final_score,
          graded_at,
          photo_url,
          feedback_text,
          grading_breakdown(
            shirt_score,
            pant_score,
            shoes_score,
            grooming_score,
            cleanliness_score,
            shirt_feedback,
            pant_feedback,
            shoes_feedback,
            grooming_feedback,
            cleanliness_feedback
          )
        `
        )
        .eq('user_id', userData.user_id)
        .order('graded_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (isMounted) {
        setGrades(data || []);
      }
    } catch (err) {
      if (isMounted) {
        setError('Failed to load grades');
        console.error(err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchGrades();

  return () => {
    isMounted = false;
  };
}, [userData?.id, userData?.user_id]);
    const getGradeColor = (grade) => {
    const colors = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800',
      C: 'bg-yellow-100 text-yellow-800',
      D: 'bg-orange-100 text-orange-800',
      F: 'bg-red-100 text-red-800',
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Grade History</h1>
        <p className="text-gray-600 mb-8">View all your grades and detailed feedback</p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Grades List */}
          <div className="lg:col-span-1">
            {grades.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
                No grades yet. Upload a photo to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {grades.map((grade) => (
                  <button
                    key={grade.id}
                    onClick={() => setSelectedGrade(grade)}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedGrade?.id === grade.id
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-sm text-gray-600">
                          {new Date(grade.graded_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(grade.graded_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-bold ${getGradeColor(grade.final_grade)}`}>
                        {grade.final_grade}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detailed View */}
          <div className="lg:col-span-2">
            {selectedGrade ? (
              <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
                {/* Header */}
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Grade Details</h2>
                    <div className={`px-6 py-2 rounded-full text-2xl font-bold ${getGradeColor(selectedGrade.final_grade)}`}>
                      {selectedGrade.final_grade}
                    </div>
                  </div>
                  <p className="text-gray-600">
                    {new Date(selectedGrade.graded_at).toLocaleDateString()} at{' '}
                    {new Date(selectedGrade.graded_at).toLocaleTimeString()}
                  </p>
                </div>

                {/* Photo */}
                {selectedGrade.photo_url && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Photo</h3>
                    <img
                      src={selectedGrade.photo_url}
                      alt="Uniform"
                      className="w-full h-80 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Score */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg">
                  <p className="text-gray-600 mb-2">Total Score</p>
                  <p className="text-4xl font-bold text-indigo-600">{selectedGrade.final_score}/100</p>
                </div>

                {/* Breakdown */}
                {selectedGrade.grading_breakdown && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">Score Breakdown</h3>
                    <div className="space-y-4">
                      {/* Shirt */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">👕 Shirt</span>
                          <span className="text-lg font-bold text-gray-800">
                            {selectedGrade.grading_breakdown.shirt_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${selectedGrade.grading_breakdown.shirt_score}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{selectedGrade.grading_breakdown.shirt_feedback}</p>
                      </div>

                      {/* Pants */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">👖 Pants</span>
                          <span className="text-lg font-bold text-gray-800">
                            {selectedGrade.grading_breakdown.pant_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${selectedGrade.grading_breakdown.pant_score}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{selectedGrade.grading_breakdown.pant_feedback}</p>
                      </div>

                      {/* Shoes */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">👞 Shoes</span>
                          <span className="text-lg font-bold text-gray-800">
                            {selectedGrade.grading_breakdown.shoes_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${selectedGrade.grading_breakdown.shoes_score}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{selectedGrade.grading_breakdown.shoes_feedback}</p>
                      </div>

                      {/* Grooming */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">💇 Grooming</span>
                          <span className="text-lg font-bold text-gray-800">
                            {selectedGrade.grading_breakdown.grooming_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${selectedGrade.grading_breakdown.grooming_score}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{selectedGrade.grading_breakdown.grooming_feedback}</p>
                      </div>

                      {/* Cleanliness */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">✨ Cleanliness</span>
                          <span className="text-lg font-bold text-gray-800">
                            {selectedGrade.grading_breakdown.cleanliness_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ width: `${selectedGrade.grading_breakdown.cleanliness_score}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{selectedGrade.grading_breakdown.cleanliness_feedback}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Feedback */}
                {selectedGrade.feedback_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">Admin Feedback</h3>
                    <p className="text-amber-800">{selectedGrade.feedback_text}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                {grades.length > 0 ? 'Select a grade to see details' : 'No grades available'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
