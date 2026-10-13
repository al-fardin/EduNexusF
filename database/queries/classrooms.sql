-- name: CreateClassroom :one
INSERT INTO classrooms (
    owner_id,
    name,
    section,
    subject,
    room,
    description,
    class_code
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING *;


-- name: GetClassroomByID :one
SELECT *
FROM classrooms
WHERE id = $1
  AND deleted_at IS NULL
LIMIT 1;


-- name: GetClassroomByCode :one
SELECT *
FROM classrooms
WHERE class_code = $1
  AND status = 'active'
  AND deleted_at IS NULL
LIMIT 1;


-- name: ListClassroomsByOwner :many
SELECT *
FROM classrooms
WHERE owner_id = $1
  AND deleted_at IS NULL
ORDER BY
    CASE
        WHEN status = 'active' THEN 0
        ELSE 1
    END,
    created_at DESC
LIMIT $2
OFFSET $3;


-- name: UpdateClassroom :one
UPDATE classrooms
SET
    name = $2,
    section = $3,
    subject = $4,
    room = $5,
    description = $6,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING *;


-- name: ArchiveClassroom :one
UPDATE classrooms
SET
    status = 'archived',
    archived_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING *;


-- name: UnarchiveClassroom :one
UPDATE classrooms
SET
    status = 'active',
    archived_at = NULL,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING *;


-- name: DeleteClassroom :execrows
UPDATE classrooms
SET
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;