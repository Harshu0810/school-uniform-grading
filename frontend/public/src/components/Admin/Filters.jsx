
// FILE: frontend/src/components/Admin/Filters.jsx
// Filter and search component for Admin Dashboard
// Allows filtering students by grade, class, section and searching by name/roll

import React from 'react';

export default function Filters({
  searchQuery,
  onSearchChange,
  gradeFilter,
  onGradeChange,
  classFilter,
  onClassChange,
  sectionFilter,
  onSectionChange,
  onClearFilters,
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      {/* Header with title and clear button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Filters & Search</h2>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition text-sm font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Filter inputs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Search by Name or Roll Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔍 Search (Name / Roll)
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type name or roll..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Filter by Grade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 Grade
          </label>
          <select
            value={gradeFilter}
            onChange={(e) => onGradeChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">All Grades</option>
            <option value="A">A - Excellent</option>
            <option value="B">B - Very Good</option>
            <option value="C">C - Good</option>
            <option value="D">D - Needs Work</option>
            <option value="F">F - Fail</option>
          </select>
        </div>

        {/* Filter by Class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏫 Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">All Classes</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
            <option value="10A">Class 10A</option>
            <option value="10B">Class 10B</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
            <option value="12A">Class 12A</option>
            <option value="12B">Class 12B</option>
          </select>
        </div>

        {/* Filter by Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Section
          </label>
          <select
            value={sectionFilter}
            onChange={(e) => onSectionChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>

        {/* Info Box */}
        <div className="flex items-end">
          <div className="text-sm text-gray-700 p-3 bg-blue-50 rounded w-full border border-blue-200 font-medium">
            💡 Use filters to find specific students quickly
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {(searchQuery || gradeFilter || classFilter || sectionFilter) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            <strong>Active Filters:</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                Search: {searchQuery}
              </span>
            )}
            {gradeFilter && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Grade: {gradeFilter}
              </span>
            )}
            {classFilter && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Class: {classFilter}
              </span>
            )}
            {sectionFilter && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                Section: {sectionFilter}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*
USAGE IN AdminDashboard.jsx:

import Filters from './Filters';
import StudentList from './StudentList';

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Apply filters to students array
  const filteredStudents = students.filter((student) => {
    const matchSearch =
      searchQuery === '' ||
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchGrade =
      gradeFilter === '' ||
      student.latestGrade?.final_grade === gradeFilter;

    const matchClass =
      classFilter === '' ||
      student.class === classFilter;

    const matchSection =
      sectionFilter === '' ||
      student.section === sectionFilter;

    return matchSearch && matchGrade && matchClass && matchSection;
  });

  return (
    <>
      <Filters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        gradeFilter={gradeFilter}
        onGradeChange={setGradeFilter}
        classFilter={classFilter}
        onClassChange={setClassFilter}
        sectionFilter={sectionFilter}
        onSectionChange={setSectionFilter}
        onClearFilters={() => {
          setSearchQuery('');
          setGradeFilter('');
          setClassFilter('');
          setSectionFilter('');
        }}
      />
      <StudentList students={filteredStudents} />
    </>
  );
}
*/
