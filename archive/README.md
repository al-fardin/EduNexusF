# Local archive

`backups/` retains the 30 pre-existing local backup directories moved out of the
workspace root during organization. These copies were moved, not deleted, and
remain ignored by Git. They are not the active backend or frontend.

`scaffolds/` preserves unused starter files. Local historical build outputs, when
present, live under `outputs/`. The archive is excluded from Docker build context;
application builds and Go checks use `backend/` and `frontend/` instead.

Private database dumps remain in the existing ignored
`release-builds/database-backups/` directory. Uploaded files remain in `uploads/`.
