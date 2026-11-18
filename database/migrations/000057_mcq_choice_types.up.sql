-- Central grading used by marks, gradebook, analytics and recheck receipts.
-- Checkbox questions award full points only for the exact set of answers.
CREATE FUNCTION edunexus_mcq_score(question jsonb, answer text) RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
 SELECT CASE WHEN COALESCE(answer,'')='' THEN 0
 WHEN COALESCE(question->>'selection','single')='multiple' THEN
  CASE WHEN answer=(SELECT string_agg(value::text,',' ORDER BY value::int)
    FROM jsonb_array_elements_text(COALESCE(question->'correct_options','[]'::jsonb)) AS t(value))
  THEN (question->>'points')::int ELSE 0 END
 WHEN answer=question->>'correct_option' THEN (question->>'points')::int ELSE 0 END
$$;
