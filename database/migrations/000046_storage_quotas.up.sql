ALTER TABLE classrooms ADD COLUMN storage_quota_bytes BIGINT NOT NULL DEFAULT 524288000 CHECK(storage_quota_bytes BETWEEN 10485760 AND 2147483648);

-- Counts stored files, including hidden materials and submission versions.
CREATE FUNCTION edunexus_storage_used(p_class UUID) RETURNS BIGINT LANGUAGE SQL VOLATILE AS $$
 SELECT COALESCE((SELECT sum(file_size) FROM classroom_materials WHERE classroom_id=p_class),0)
 + COALESCE((SELECT sum(file_size) FROM classroom_messages m JOIN classroom_conversations t ON t.id=m.conversation_id WHERE t.classroom_id=p_class),0)
 + COALESCE((SELECT sum(octet_length(file_bytes)) FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=p_class),0)
 + COALESCE((SELECT sum(octet_length(executable)) FROM classroom_question_testers WHERE classroom_id=p_class),0)
$$;
CREATE FUNCTION edunexus_enforce_storage_quota() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE class UUID; delta BIGINT; quota BIGINT;
BEGIN
 IF TG_TABLE_NAME='classroom_materials' THEN class=NEW.classroom_id;delta=NEW.file_size;IF TG_OP='UPDATE' THEN delta=delta-OLD.file_size;END IF;
 ELSIF TG_TABLE_NAME='classroom_messages' THEN SELECT classroom_id INTO class FROM classroom_conversations WHERE id=NEW.conversation_id;delta=NEW.file_size;IF TG_OP='UPDATE' THEN delta=delta-OLD.file_size;END IF;
 ELSIF TG_TABLE_NAME='classroom_assignment_submissions' THEN SELECT classroom_id INTO class FROM classroom_assignments WHERE id=NEW.assignment_id;delta=COALESCE(octet_length(NEW.file_bytes),0);IF TG_OP='UPDATE' THEN delta=delta-COALESCE(octet_length(OLD.file_bytes),0);END IF;
 ELSE class=NEW.classroom_id;delta=COALESCE(octet_length(NEW.executable),0);IF TG_OP='UPDATE' THEN delta=delta-COALESCE(octet_length(OLD.executable),0);END IF;
 END IF;
 IF delta>0 THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('storage:'||class::text,0));
  SELECT storage_quota_bytes INTO quota FROM classrooms WHERE id=class;
  IF edunexus_storage_used(class)+delta>quota THEN RAISE EXCEPTION 'Class storage quota exceeded' USING ERRCODE='23514',CONSTRAINT='edunexus_storage_quota';END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER storage_material BEFORE INSERT OR UPDATE OF file_size ON classroom_materials FOR EACH ROW EXECUTE FUNCTION edunexus_enforce_storage_quota();
CREATE TRIGGER storage_message BEFORE INSERT OR UPDATE OF file_size ON classroom_messages FOR EACH ROW EXECUTE FUNCTION edunexus_enforce_storage_quota();
CREATE TRIGGER storage_submission BEFORE INSERT OR UPDATE OF file_bytes ON classroom_assignment_submissions FOR EACH ROW EXECUTE FUNCTION edunexus_enforce_storage_quota();
CREATE TRIGGER storage_tester BEFORE INSERT OR UPDATE OF executable ON classroom_question_testers FOR EACH ROW EXECUTE FUNCTION edunexus_enforce_storage_quota();
