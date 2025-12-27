
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useStudent() {
  const { userData } = useAuth();
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    setStudentData(userData);
  }, [userData]);

  return studentData;
}
