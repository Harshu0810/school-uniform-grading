
// components/Admin/Analytics.jsx
// Complete analytics dashboard with charts and statistics
// Ready for: frontend/src/components/Admin/Analytics.jsx

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getGradeDistribution,
  getDailyStats,
  getClassWiseDistribution,
  getOverallStats,
  getTopStudents,
  getStudentsNeedingHelp,
  getWeeklyStats,
} from '../../services/analyticsService';
import LoadingSpinner from '../Common/LoadingSpinner';
import Navbar from '../Common/Navbar';

// ============================================================================
// STAT CARD COMPONENT (Reusable)
// ============================================================================
function StatCard({ icon, label, value, subtext, color = 'bg-blue-50' }) {
  return (
    <div className={`${color} rounded-lg p-6 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ANALYTICS COMPONENT
// ============================================================================
export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [overallStats, setOverallStats] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [classWiseDistribution, setClassWiseDistribution] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [needsHelpStudents, setNeedsHelpStudents] = useState([]);

  // Filter states
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedWeeks, setSelectedWeeks] = useState(12);

  // Load all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Reload when filter changes
  useEffect(() => {
    fetchDailyStats();
  }, [selectedDays]);

  useEffect(() => {
    fetchWeeklyStats();
  }, [selectedWeeks]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all data in parallel
      const [stats, distrib, daily, weekly, classwise, top, needsHelp] = await Promise.all([
        getOverallStats(),
        getGradeDistribution(),
        getDailyStats(selectedDays),
        getWeeklyStats(selectedWeeks),
        getClassWiseDistribution(),
        getTopStudents(10),
        getStudentsNeedingHelp(10),
      ]);

      if (stats.success) setOverallStats(stats.stats);
      if (distrib.success) setGradeDistribution(distrib.chartData);
      if (daily.success) setDailyStats(daily.chartData);
      if (weekly.success) setWeeklyStats(weekly.chartData);
      if (classwise.success) setClassWiseDistribution(classwise.chartData);
      if (top.success) setTopStudents(top.students);
      if (needsHelp.success) setNeedsHelpStudents(needsHelp.students);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    const result = await getDailyStats(selectedDays);
    if (result.success) setDailyStats(result.chartData);
  };

  const fetchWeeklyStats = async () => {
    const result = await getWeeklyStats(selectedWeeks);
    if (result.success) setWeeklyStats(result.chartData);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Colors for charts
  const COLORS = ['#10b981', '#3b82f6', '#eab308', '#f97316', '#ef4444'];
  const gradeColors = {
    A: '#10b981',
    B: '#3b82f6',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Overview of uniform grading statistics and trends</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* ===== OVERALL STATISTICS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="👥"
            label="Total Students"
            value={overallStats?.totalStudents || 0}
            color="bg-blue-50"
          />
          <StatCard
            icon="✅"
            label="Graded Students"
            value={overallStats?.gradedStudents || 0}
            subtext={`${overallStats?.gradingRate || 0}% of total`}
            color="bg-green-50"
          />
          <StatCard
            icon="📊"
            label="Total Grades"
            value={overallStats?.totalGrades || 0}
            color="bg-indigo-50"
          />
          <StatCard
            icon="⭐"
            label="Average Score"
            value={`${overallStats?.avgScore || 0}/100`}
            subtext={`High: ${overallStats?.highestScore}, Low: ${overallStats?.lowestScore}`}
            color="bg-yellow-50"
          />
        </div>

        {/* ===== GRADE DISTRIBUTION PIE CHART ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Grade Distribution</h2>
            {gradeDistribution && gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution.map((entry) => (
                      <Cell key={`cell-${entry.grade}`} fill={gradeColors[entry.grade]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} students`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600 text-center py-12">No data available</p>
            )}
          </div>

          {/* Grade Breakdown Table */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Grade Breakdown</h2>
            <div className="space-y-3">
              {gradeDistribution && gradeDistribution.length > 0 ? (
                gradeDistribution.map((item) => (
                  <div key={item.grade} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: gradeColors[item.grade] }}
                      />
                      <span className="text-lg font-semibold text-gray-800">Grade {item.grade}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{item.count}</p>
                      <p className="text-sm text-gray-600">{item.percentage}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* ===== DAILY GRADING TRENDS ===== */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Daily Grading Trends</h2>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
          </div>

          {dailyStats && dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  name="Grades Count"
                  yAxisId="left"
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#10b981"
                  name="Avg Score"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-600 text-center py-12">No data available</p>
          )}
        </div>

        {/* ===== WEEKLY STATISTICS ===== */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Weekly Statistics</h2>
            <select
              value={selectedWeeks}
              onChange={(e) => setSelectedWeeks(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={4}>Last 4 weeks</option>
              <option value={8}>Last 8 weeks</option>
              <option value={12}>Last 12 weeks</option>
            </select>
          </div>

          {weeklyStats && weeklyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Grades Count" />
                <Bar dataKey="avgScore" fill="#10b981" name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-600 text-center py-12">No data available</p>
          )}
        </div>

        {/* ===== CLASS-WISE DISTRIBUTION ===== */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Class-Wise Performance</h2>

          {classWiseDistribution && classWiseDistribution.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Class</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Students</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Avg Score</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-800">A</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-800">B</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-800">C</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-800">D</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-800">F</th>
                  </tr>
                </thead>
                <tbody>
                  {classWiseDistribution.map((item) => (
                    <tr key={item.class} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">{item.class}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.studentCount}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        {item.avgScore}/100
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          {item.gradeA}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {item.gradeB}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                          {item.gradeC}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">
                          {item.gradeD}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                          {item.gradeF}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-12">No data available</p>
          )}
        </div>

        {/* ===== TOP STUDENTS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Top Performers</h2>
            {topStudents && topStudents.length > 0 ? (
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{student.name}</p>
                      <p className="text-sm text-gray-600">Class {student.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{student.avgScore}</p>
                      <p className="text-xs text-gray-500">{student.gradeCount} grades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-12">No data available</p>
            )}
          </div>

          {/* Needs Improvement */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Students Needing Help</h2>
            {needsHelpStudents && needsHelpStudents.length > 0 ? (
              <div className="space-y-3">
                {needsHelpStudents.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{student.name}</p>
                      <p className="text-sm text-gray-600">Class {student.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{student.avgScore}</p>
                      <p className="text-xs text-gray-500">{student.gradeCount} grades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-12">No data available</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
