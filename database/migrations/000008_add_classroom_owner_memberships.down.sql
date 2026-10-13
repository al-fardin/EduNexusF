DROP TRIGGER IF EXISTS
trg_classroom_owner_membership
ON classrooms;

DROP FUNCTION IF EXISTS
ensure_classroom_owner_membership();

DELETE FROM classroom_memberships
USING classrooms
WHERE classroom_memberships.classroom_id =
      classrooms.id
  AND classroom_memberships.user_id =
      classrooms.owner_id
  AND classroom_memberships.member_role =
      'teacher';