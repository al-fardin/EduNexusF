ALTER TABLE classroom_exams ADD COLUMN IF NOT EXISTS allow_mobile_mcq BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE classroom_exam_attempts ADD COLUMN IF NOT EXISTS entry_mode TEXT NOT NULL DEFAULT 'desktop' CHECK(entry_mode IN ('desktop','mobile'));
