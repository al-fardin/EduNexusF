CREATE TABLE academic_terms (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(char_length(title) BETWEEN 2 AND 100),
 starts_on DATE NOT NULL,
 ends_on DATE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(ends_on>=starts_on AND ends_on<=starts_on+730)
);
CREATE UNIQUE INDEX academic_terms_owner_title ON academic_terms(owner_id,lower(title));
ALTER TABLE classrooms ADD COLUMN term_id UUID REFERENCES academic_terms(id) ON DELETE SET NULL;
ALTER TABLE classrooms ADD COLUMN syllabus TEXT NOT NULL DEFAULT '' CHECK(char_length(syllabus)<=50000);
CREATE INDEX classrooms_term ON classrooms(term_id) WHERE deleted_at IS NULL;
CREATE TABLE classroom_rollovers (
 source_classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 new_classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 payload_hash TEXT NOT NULL,
 PRIMARY KEY(actor_id,request_id)
);
