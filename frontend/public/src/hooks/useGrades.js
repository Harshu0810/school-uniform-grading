import { useState, useCallback } from 'react';
import { getStudentGrades } from '../services/gradingService';

export default function useGrades(studentId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStudentGrades(studentId);
      if (result.success) {
        setGrades(result.grades);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  return { grades, loading, error, fetchGrades };
}
