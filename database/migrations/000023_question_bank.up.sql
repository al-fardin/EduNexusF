CREATE TABLE IF NOT EXISTS classroom_question_bank (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 created_by UUID NOT NULL REFERENCES users(id),
 question JSONB NOT NULL CHECK(jsonb_typeof(question)='object'),
 topic VARCHAR(120) NOT NULL DEFAULT '',
 difficulty VARCHAR(12) NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy','medium','hard')),
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bank_class_filter ON classroom_question_bank(classroom_id,topic,difficulty);
