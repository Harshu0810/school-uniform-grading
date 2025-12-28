import React, { useState } from 'react';

export default function StudentList({ students, onSelectStudent, filters }) {
  const [sortBy, setSortBy] = useState('name'); // name, grade, score, lastGraded

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

  const sortStudents = (studentsToSort) => {
    const sorted = [...studentsToSort];

    switch (sortBy) {
      case 'grade':
        return sorted.sort((a, b) => {
          const gradeOrder = { A: 1, B: 2, C: 3, D: 4, F: 5 };
          const aGrade = a.latestGrade?.final_grade || 'F';
          const bGrade = b.latestGrade?.final_grade || 'F';
          return gradeOrder[aGrade] - gradeOrder[bGrade];
        });

      case 'score':
        return sorted.sort((a, b) => {
          const aScore = a.latestGrade?.final_score || 0;
          const bScore = b.latestGrade?.final_score || 0;
          return bScore - aScore;
        });

      case 'lastGraded':
        return sorted.sort((a, b) => {
          const aDate = new Date(a.latestGrade?.graded_at || 0);
          const bDate = new Date(b.latestGrade?.graded_at || 0);
          return bDate - aDate;
        });

      case 'name':
      default:
        return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
  };

  const sortedStudents = sortStudents(students);

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">No students found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">
          Students ({sortedStudents.length})
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="name">Sort by Name</option>
          <option value="grade">Sort by Grade</option>
          <option value="score">Sort by Score</option>
          <option value="lastGraded">Sort by Last Graded</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Class</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Roll</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Grade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Score</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Last Graded</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => (
              <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                  {student.full_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.class}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.roll_number}
                </td>
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
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                  {student.latestGrade ? `${student.latestGrade.final_score}/100` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.latestGrade
                    ? new Date(student.latestGrade.graded_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onSelectStudent(student)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
