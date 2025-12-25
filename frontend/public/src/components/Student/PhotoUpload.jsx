import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import { analyzeUniform } from '../../utils/gradingLogic';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Navbar from '../../components/Common/Navbar';

export default function PhotoUploadPage() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gradingResult, setGradingResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    // Validate file
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUploadAndGrade = async () => {
    if (!file || !user) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Upload photo to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uniform-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('uniform-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // Step 3: Analyze uniform using rule-based logic
      const gradingData = analyzeUniform(preview);

      // Step 4: Save grade to database
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .insert([
          {
            student_id: userData.id,
            final_grade: gradingData.grade,
            final_score: gradingData.score,
            photo_url: photoUrl,
          },
        ])
        .select()
        .single();

      if (gradeError) throw gradeError;

      // Step 5: Save grading breakdown
      const { error: breakdownError } = await supabase
        .from('grading_breakdown')
        .insert([
          {
            grade_id: gradeData.id,
            shirt_score: gradingData.breakdown.shirt,
            pant_score: gradingData.breakdown.pant,
            shoes_score: gradingData.breakdown.shoes,
            grooming_score: gradingData.breakdown.grooming,
            cleanliness_score: gradingData.breakdown.cleanliness,
            shirt_feedback: gradingData.feedback.shirt,
            pant_feedback: gradingData.feedback.pant,
            shoes_feedback: gradingData.feedback.shoes,
            grooming_feedback: gradingData.feedback.grooming,
            cleanliness_feedback: gradingData.feedback.cleanliness,
          },
        ]);

      if (breakdownError) throw breakdownError;

      // Show result
      setGradingResult({
        ...gradingData,
        gradeId: gradeData.id,
      });
    } catch (err) {
      setError(err.message || 'Failed to upload and grade');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    const colors = {
      A: 'text-green-600 bg-green-50 border-green-200',
      B: 'text-blue-600 bg-blue-50 border-blue-200',
      C: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      D: 'text-orange-600 bg-orange-50 border-orange-200',
      F: 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[grade] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading && !gradingResult) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Uniform Photo</h1>
        <p className="text-gray-600 mb-8">Take or upload a photo of your uniform to get instant grading</p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* If result shown, display it */}
        {gradingResult ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Grade</h2>
              <div className={`inline-block p-8 rounded-lg border-4 ${getGradeColor(gradingResult.grade)}`}>
                <div className="text-7xl font-bold">{gradingResult.grade}</div>
                <div className="text-3xl font-semibold mt-2">{gradingResult.score}/100</div>
              </div>
            </div>

            {/* Photo Preview */}
            <div className="mb-8">
              <img
                src={preview}
                alt="Uploaded uniform"
                className="w-full max-h-96 object-cover rounded-lg"
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">👕 Shirt</span>
                    <span className="font-semibold">{gradingResult.breakdown.shirt}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">👖 Pants</span>
                    <span className="font-semibold">{gradingResult.breakdown.pant}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">👞 Shoes</span>
                    <span className="font-semibold">{gradingResult.breakdown.shoes}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">💇 Grooming</span>
                    <span className="font-semibold">{gradingResult.breakdown.grooming}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">✨ Cleanliness</span>
                    <span className="font-semibold">{gradingResult.breakdown.cleanliness}/100</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Feedback</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Shirt:</span>
                    <p className="text-gray-600">{gradingResult.feedback.shirt}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Pants:</span>
                    <p className="text-gray-600">{gradingResult.feedback.pant}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Shoes:</span>
                    <p className="text-gray-600">{gradingResult.feedback.shoes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setGradingResult(null);
                  setPreview(null);
                  setFile(null);
                }}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
              >
                Upload Another Photo
              </button>
              <button
                onClick={() => navigate('/grade-history')}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition"
              >
                View All Grades
              </button>
            </div>
          </div>
        ) : (
          /* Upload Section */
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
            >
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Click to upload or drag and drop</h3>
              <p className="text-gray-600 mb-4">PNG, JPG, GIF up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className="mt-8">
                <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-96 object-cover rounded-lg mb-6"
                />
                <button
                  onClick={handleUploadAndGrade}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
                >
                  {loading ? 'Processing...' : 'Get Grade'}
                </button>
              </div>
            )}

            {/* Guidelines */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">📋 Photo Guidelines</h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>✓ Take a full-body photo in good lighting</li>
                <li>✓ Make sure your entire uniform is visible</li>
                <li>✓ Face should be clearly visible</li>
                <li>✓ No filters or heavy editing</li>
                <li>✓ Use a plain background if possible</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
