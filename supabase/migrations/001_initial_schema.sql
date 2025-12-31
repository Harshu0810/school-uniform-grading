-- Drop all tables to start fresh
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS grading_breakdown CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Now run the complete SQL from the artifact
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_letter') THEN
    CREATE TYPE grade_letter AS ENUM ('A', 'B', 'C', 'D', 'F');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'uniform_section') THEN
    CREATE TYPE uniform_section AS ENUM ('shirt', 'pant', 'shoes', 'grooming', 'cleanliness');
  END IF;
END $$;

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name VARCHAR(255) NOT NULL,
    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),
    roll_number VARCHAR(10) NOT NULL UNIQUE,

    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT students_class_check CHECK (class ~ '^\d{1,2}[A-Z]?$')
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

-- ============================================================================
-- GRADES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,

    final_grade grade_letter,
    final_score NUMERIC(5,2) CHECK (final_score BETWEEN 0 AND 100),

    photo_url TEXT NOT NULL,
    graded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    feedback_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON grades(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_at ON grades(graded_at DESC);
CREATE INDEX IF NOT EXISTS idx_grades_final_grade ON grades(final_grade);

-- ============================================================================
-- GRADING_BREAKDOWN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS grading_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID UNIQUE NOT NULL REFERENCES grades(id) ON DELETE CASCADE,

    shirt_score NUMERIC(5,2) CHECK (shirt_score BETWEEN 0 AND 100),
    pant_score NUMERIC(5,2) CHECK (pant_score BETWEEN 0 AND 100),
    shoes_score NUMERIC(5,2) CHECK (shoes_score BETWEEN 0 AND 100),
    grooming_score NUMERIC(5,2) CHECK (grooming_score BETWEEN 0 AND 100),
    cleanliness_score NUMERIC(5,2) CHECK (cleanliness_score BETWEEN 0 AND 100),

    shirt_feedback VARCHAR(500),
    pant_feedback VARCHAR(500),
    shoes_feedback VARCHAR(500),
    grooming_feedback VARCHAR(500),
    cleanliness_feedback VARCHAR(500),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grading_breakdown_grade_id ON grading_breakdown(grade_id);

-- ============================================================================
-- ADMIN_USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================================================
-- AUDIT_LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_student_id ON audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ALL EXISTING POLICIES TO RECREATE THEM CLEANLY
-- ============================================================================
DROP POLICY IF EXISTS "Students view own profile" ON students;
DROP POLICY IF EXISTS "Students update own profile" ON students;
DROP POLICY IF EXISTS "Admins view all students" ON students;
DROP POLICY IF EXISTS "Anyone can insert students" ON students;
DROP POLICY IF EXISTS "Students view own grades" ON grades;
DROP POLICY IF EXISTS "Students insert own grades" ON grades;
DROP POLICY IF EXISTS "Admins manage all grades" ON grades;
DROP POLICY IF EXISTS "Admins manage grades" ON grades;
DROP POLICY IF EXISTS "Students view own breakdown" ON grading_breakdown;
DROP POLICY IF EXISTS "Admins manage all breakdown" ON grading_breakdown;
DROP POLICY IF EXISTS "Admins manage breakdown" ON grading_breakdown;
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "No modifications to admin_users" ON admin_users;
DROP POLICY IF EXISTS "No delete admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_log;
DROP POLICY IF EXISTS "Service can insert logs" ON audit_log;

-- ============================================================================
-- RLS POLICIES FOR STUDENTS TABLE
-- ============================================================================
CREATE POLICY "Students view own profile"
ON students FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Students update own profile"
ON students FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all students"
ON students FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert students"
ON students FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR GRADES TABLE
-- ============================================================================
CREATE POLICY "Students view own grades"
ON grades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Students insert own grades"
ON grades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all grades"
ON grades FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS POLICIES FOR GRADING_BREAKDOWN TABLE
-- ============================================================================
CREATE POLICY "Students view own breakdown"
ON grading_breakdown FOR SELECT
USING (
  grade_id IN (
    SELECT g.id FROM grades g
    WHERE g.user_id = auth.uid()
  )
);

CREATE POLICY "Students insert own breakdown"
ON grading_breakdown FOR INSERT
WITH CHECK (
  grade_id IN (
    SELECT g.id FROM grades g
    WHERE g.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all breakdown"
ON grading_breakdown FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS POLICIES FOR ADMIN_USERS TABLE
-- ============================================================================
CREATE POLICY "Admins view admin_users"
ON admin_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Prevent admin modifications"
ON admin_users FOR UPDATE
USING (false);

CREATE POLICY "Prevent admin delete"
ON admin_users FOR DELETE
USING (false);

-- ============================================================================
-- RLS POLICIES FOR AUDIT_LOG TABLE
-- ============================================================================
CREATE POLICY "Admins view audit logs"
ON audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert logs"
ON audit_log FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_grade(score NUMERIC)
RETURNS grade_letter AS $$
BEGIN
  IF score >= 85 THEN RETURN 'A';
  ELSIF score >= 70 THEN RETURN 'B';
  ELSIF score >= 60 THEN RETURN 'C';
  ELSIF score >= 50 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_final_score()
RETURNS TRIGGER AS $$
DECLARE avg_score NUMERIC;
BEGIN
  avg_score := (
    COALESCE(NEW.shirt_score, 0) +
    COALESCE(NEW.pant_score, 0) +
    COALESCE(NEW.shoes_score, 0) +
    COALESCE(NEW.grooming_score, 0) +
    COALESCE(NEW.cleanliness_score, 0)
  ) / 5;

  UPDATE grades
  SET final_score = avg_score,
      final_grade = calculate_grade(avg_score)
  WHERE id = NEW.grade_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_final_score ON grading_breakdown;
CREATE TRIGGER trg_update_final_score
AFTER INSERT OR UPDATE
ON grading_breakdown
FOR EACH ROW
EXECUTE FUNCTION update_final_score();

-- ============================================================================
-- INSERT ADMIN USERS
-- ============================================================================
INSERT INTO admin_users (user_id, email, full_name, role)
SELECT id, email,
       CASE
         WHEN email = 'hellofriends0810@gmail.com' THEN 'Hello Friends'
         WHEN email = 'pgpeeyushagrawal@gmail.com' THEN 'Piyush Agrawal'
       END,
       'admin'
FROM auth.users
WHERE email IN (
  'hellofriends0810@gmail.com',
  'pgpeeyushagrawal@gmail.com'
)
ON CONFLICT (email) DO NOTHING;
-- ============================================================================
-- DISABLE RLS TEMPORARILY TO FIX
-- ============================================================================
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all admin_users policies
DROP POLICY IF EXISTS "Admins view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Prevent admin modifications" ON admin_users;
DROP POLICY IF EXISTS "Prevent admin delete" ON admin_users;

-- Re-enable RLS with SAFE policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows everyone to read admin_users (no recursion)
CREATE POLICY "anyone_can_view_admin_users"
ON admin_users FOR SELECT
USING (true);

-- Prevent modifications
CREATE POLICY "prevent_admin_insert"
ON admin_users FOR INSERT
WITH CHECK (false);

CREATE POLICY "prevent_admin_update"
ON admin_users FOR UPDATE
USING (false);

CREATE POLICY "prevent_admin_delete"
ON admin_users FOR DELETE
USING (false);
-- Drop old grades policies
DROP POLICY IF EXISTS "Students view own grades" ON grades;
DROP POLICY IF EXISTS "Students insert own grades" ON grades;
DROP POLICY IF EXISTS "Admins manage all grades" ON grades;

-- Create new safe policies for grades
CREATE POLICY "Students can insert their own grades"
ON grades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view their own grades"
ON grades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all grades"
ON grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all grades"
ON grades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);
-- Drop all grades policies
DROP POLICY IF EXISTS "Students can insert their own grades" ON grades;
DROP POLICY IF EXISTS "Students can view their own grades" ON grades;
DROP POLICY IF EXISTS "Admins can view all grades" ON grades;
DROP POLICY IF EXISTS "Admins can manage all grades" ON grades;

-- Create simple, working policies
CREATE POLICY "Allow authenticated users to insert grades"
ON grades FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow users to view their own grades"
ON grades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow admins to view all grades"
ON grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);
-- Drop ALL policies first
DROP POLICY IF EXISTS "Allow authenticated users to insert grades" ON grades;
DROP POLICY IF EXISTS "Allow users to view their own grades" ON grades;
DROP POLICY IF EXISTS "Allow admins to view all grades" ON grades;
DROP POLICY IF EXISTS "Students view own profile" ON students;
DROP POLICY IF EXISTS "Students update own profile" ON students;
DROP POLICY IF EXISTS "Admins view all students" ON students;
DROP POLICY IF EXISTS "Anyone can insert students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to select students" ON students;
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "anyone_can_view_admin_users" ON admin_users;
DROP POLICY IF EXISTS "prevent_admin_insert" ON admin_users;
DROP POLICY IF EXISTS "prevent_admin_update" ON admin_users;
DROP POLICY IF EXISTS "prevent_admin_delete" ON admin_users;

-- ============================================================================
-- SIMPLE, WORKING POLICIES FOR STUDENTS
-- ============================================================================
CREATE POLICY "students_select_own"
ON students FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "students_insert_own"
ON students FOR INSERT
WITH CHECK (true);

CREATE POLICY "students_update_own"
ON students FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SIMPLE, WORKING POLICIES FOR ADMIN_USERS
-- ============================================================================
CREATE POLICY "admin_users_select_all"
ON admin_users FOR SELECT
USING (true);

CREATE POLICY "admin_users_prevent_insert"
ON admin_users FOR INSERT
WITH CHECK (false);

CREATE POLICY "admin_users_prevent_update"
ON admin_users FOR UPDATE
USING (false);

CREATE POLICY "admin_users_prevent_delete"
ON admin_users FOR DELETE
USING (false);

-- ============================================================================
-- SIMPLE, WORKING POLICIES FOR GRADES
-- ============================================================================
CREATE POLICY "grades_insert_any"
ON grades FOR INSERT
WITH CHECK (true);

CREATE POLICY "grades_select_own_or_admin"
ON grades FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "grades_update_admin"
ON grades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- ============================================================================
-- SIMPLE, WORKING POLICIES FOR GRADING_BREAKDOWN
-- ============================================================================
CREATE POLICY "grading_breakdown_insert_any"
ON grading_breakdown FOR INSERT
WITH CHECK (true);

CREATE POLICY "grading_breakdown_select_any"
ON grading_breakdown FOR SELECT
USING (true);

CREATE POLICY "grading_breakdown_update_any"
ON grading_breakdown FOR UPDATE
USING (true);
-- Disable RLS on all tables temporarily
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE grading_breakdown DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
