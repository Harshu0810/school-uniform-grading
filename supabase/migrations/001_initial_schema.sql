CREATE TYPE grade_letter AS ENUM ('A', 'B', 'C', 'D', 'F');

-- ============================================================================
-- STEP 2: Create students table
-- ============================================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),
    roll_number VARCHAR(10) NOT NULL UNIQUE,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_class ON students(class);
CREATE INDEX idx_students_roll_number ON students(roll_number);

-- ============================================================================
-- STEP 3: Create grades table
-- ============================================================================
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    final_grade grade_letter NOT NULL,
    final_score NUMERIC(5, 2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
    photo_url TEXT NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback_text TEXT
);

CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_graded_at ON grades(graded_at DESC);
CREATE INDEX idx_grades_final_grade ON grades(final_grade);
CREATE INDEX idx_grades_student_graded_at ON grades(student_id, graded_at DESC);

-- ============================================================================
-- STEP 4: Create grading_breakdown table
-- ============================================================================
CREATE TABLE grading_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL UNIQUE REFERENCES grades(id) ON DELETE CASCADE,
    shirt_score NUMERIC(5, 2) NOT NULL CHECK (shirt_score >= 0 AND shirt_score <= 100),
    pant_score NUMERIC(5, 2) NOT NULL CHECK (pant_score >= 0 AND pant_score <= 100),
    shoes_score NUMERIC(5, 2) NOT NULL CHECK (shoes_score >= 0 AND shoes_score <= 100),
    grooming_score NUMERIC(5, 2) NOT NULL CHECK (grooming_score >= 0 AND grooming_score <= 100),
    cleanliness_score NUMERIC(5, 2) NOT NULL CHECK (cleanliness_score >= 0 AND cleanliness_score <= 100),
    shirt_feedback VARCHAR(500),
    pant_feedback VARCHAR(500),
    shoes_feedback VARCHAR(500),
    grooming_feedback VARCHAR(500),
    cleanliness_feedback VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grading_breakdown_grade_id ON grading_breakdown(grade_id);

-- ============================================================================
-- STEP 5: Create admin_users table
-- ============================================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

-- ============================================================================
-- STEP 6: Create audit_log table (optional)
-- ============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_student_id ON audit_log(student_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- STEP 7: Enable Row Level Security
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: RLS Policies for students table
-- ============================================================================

-- Students can view their own profile
CREATE POLICY "Students can view their own profile"
    ON students FOR SELECT
    USING (auth.uid() = user_id);

-- Students can update their own profile
CREATE POLICY "Students can update their own profile"
    ON students FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all students
CREATE POLICY "Admins can view all students"
    ON students FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============================================================================
-- STEP 9: RLS Policies for grades table
-- ============================================================================

-- Students can view their own grades
CREATE POLICY "Students can view their own grades"
    ON grades FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM students 
        WHERE students.id = grades.student_id 
        AND students.user_id = auth.uid()
    ));

-- Students can create their own grades
CREATE POLICY "Students can create their own grades"
    ON grades FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM students 
        WHERE students.id = student_id 
        AND students.user_id = auth.uid()
    ));

-- Admins can view all grades
CREATE POLICY "Admins can view all grades"
    ON grades FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admins can update grades
CREATE POLICY "Admins can update grades"
    ON grades FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============================================================================
-- STEP 10: RLS Policies for grading_breakdown table
-- ============================================================================

-- Students can view their own breakdown
CREATE POLICY "Students can view their own grading breakdown"
    ON grading_breakdown FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM grades 
        INNER JOIN students ON students.id = grades.student_id
        WHERE grades.id = grading_breakdown.grade_id 
        AND students.user_id = auth.uid()
    ));

-- Students can create breakdown
CREATE POLICY "Students can create grading breakdown for their grades"
    ON grading_breakdown FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM grades 
        INNER JOIN students ON students.id = grades.student_id
        WHERE grades.id = grade_id 
        AND students.user_id = auth.uid()
    ));

-- Admins can view all breakdowns
CREATE POLICY "Admins can view all grading breakdowns"
    ON grading_breakdown FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============================================================================
-- STEP 11: RLS Policies for admin_users table
-- ============================================================================

-- Admins can view other admins
CREATE POLICY "Admins can view other admins"
    ON admin_users FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- Prevent modifications
CREATE POLICY "No one can modify admin_users"
    ON admin_users FOR UPDATE
    USING (false);

CREATE POLICY "No one can delete admin_users"
    ON admin_users FOR DELETE
    USING (false);

-- ============================================================================
-- STEP 12: RLS Policies for audit_log table
-- ============================================================================

-- Admins can view logs
CREATE POLICY "Admins can view audit logs"
    ON audit_log FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============================================================================
-- STEP 13: Create useful views
-- ============================================================================

-- View: Student with latest grade
CREATE OR REPLACE VIEW student_latest_grades AS
SELECT 
    s.id,
    s.user_id,
    s.full_name,
    s.class,
    s.section,
    s.roll_number,
    g.id AS grade_id,
    g.final_grade,
    g.final_score,
    g.graded_at,
    ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY g.graded_at DESC) AS rank
FROM students s
LEFT JOIN grades g ON s.id = g.student_id;

-- View: Grade distribution by class
CREATE OR REPLACE VIEW grade_distribution AS
SELECT 
    s.class,
    g.final_grade,
    COUNT(*) AS count
FROM students s
INNER JOIN grades g ON s.id = g.student_id
GROUP BY s.class, g.final_grade;

-- View: Daily grading statistics
CREATE OR REPLACE VIEW daily_grading_stats AS
SELECT 
    DATE(g.graded_at) AS date,
    COUNT(*) AS total_grades,
    AVG(g.final_score) AS avg_score,
    MAX(g.final_score) AS max_score,
    MIN(g.final_score) AS min_score
FROM grades g
GROUP BY DATE(g.graded_at);
