// pages/Admin/Dashboard.jsx
// Admin dashboard showing all students with filtering and search

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/authService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Navbar from '../../components/Common/Navbar';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  
  // Selected student for details
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
  setStudents([]);
  setFilteredStudents([]);
  setError('');

  let isMounted = true;

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('students')
        .select(
          `
          id,
          full_name,
          class,
          section,
          roll_number,
          created_at,
          grades(
            id,
            final_grade,
            final_score,
            graded_at
          )
        `
        );

      if (fetchError) throw fetchError;

      if (isMounted) {
        const studentsWithLatestGrade = (data || []).map((student) => {
          const sortedGrades = student.grades?.sort((a, b) => 
            new Date(b.graded_at) - new Date(a.graded_at)
          ) || [];

          return {
            ...student,
            latestGrade: sortedGrades[0] || null,
          };
        });

        setStudents(studentsWithLatestGrade);
      }
    } catch (err) {
      if (isMounted) {
        setError('Failed to load students');
        console.error(err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchStudents();

  return () => {
    isMounted = false;
  };
}, []);
  const applyFilters = () => {
    let filtered = [...students];

    // Search by name or roll number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.roll_number.toLowerCase().includes(query)
      );
    }

    // Filter by grade
    if (gradeFilter) {
      filtered = filtered.filter((s) => s.latestGrade?.final_grade === gradeFilter);
    }

    // Filter by class
    if (classFilter) {
      filtered = filtered.filter((s) => s.class === classFilter);
    }

    // Filter by section
    if (sectionFilter) {
      filtered = filtered.filter((s) => s.section === sectionFilter);
    }

    setFilteredStudents(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setGradeFilter('');
    setClassFilter('');
    setSectionFilter('');
  };

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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage and monitor all students</p>
          </div>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            View Analytics
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters & Search</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search (Name / Roll)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Grades</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Classes</option>
                <option value="10A">10A</option>
                <option value="10B">10B</option>
                <option value="12A">12A</option>
                <option value="12B">12B</option>
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Sections</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            {/* Clear Button */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Total Students</p>
            <p className="text-3xl font-bold text-gray-800">{students.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Graded Students</p>
            <p className="text-3xl font-bold text-gray-800">
              {students.filter((s) => s.latestGrade).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Avg Score</p>
            <p className="text-3xl font-bold text-gray-800">
              {(
                students
                  .filter((s) => s.latestGrade)
                  .reduce((sum, s) => sum + s.latestGrade.final_score, 0) /
                  (students.filter((s) => s.latestGrade).length || 1)
              ).toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Filtered Count</p>
            <p className="text-3xl font-bold text-gray-800">{filteredStudents.length}</p>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Class</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Roll</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Latest Grade</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Score</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Last Graded</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">{student.full_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.class}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.roll_number}</td>
                      <td className="px-6 py-4">
                        {student.latestGrade ? (
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(
                              student.latestGrade.final_grade
                            )}`}
                          >
                            {student.latestGrade.final_grade}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {student.latestGrade ? `${student.latestGrade.final_score}/100` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.latestGrade
                          ? new Date(student.latestGrade.graded_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.full_name}</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Class</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedStudent.class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Section</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedStudent.section}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Roll Number</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedStudent.roll_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Latest Grade</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {selectedStudent.latestGrade?.final_grade || '-'}
                    </p>
                  </div>
                </div>
                {selectedStudent.latestGrade && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Score</p>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-indigo-600 h-4 rounded-full"
                        style={{ width: `${selectedStudent.latestGrade.final_score}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedStudent.latestGrade.final_score}/100
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
