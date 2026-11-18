# Optional institutions

Institutions organize classes into departments and semesters. They are optional:
creating a class without opening the Institution setting uses the original request,
creates no institution association, and requires no organizational membership.

Use **Institutions** in the navigation to create a workspace. Its owner can invite
admins, teachers and students by email address. Invitations appear in the recipient's
institution inbox, expire after seven days, and require a verified account and explicit
acceptance. This release does not send these invitations by email.

An owner/admin manages departments, dated semesters, invitations and members. An
admin cannot grant or manage another admin; only the owner can. The owner cannot be
removed or demoted. Changes require current versions; member changes and detaching
classes require a reason. The owner/admin activity history records these changes.

A classroom owner with an active owner/admin/teacher institution membership can
choose its institution during creation or later in Class settings → Institution.
Department and semester are independently optional. An admin may make a listed
class standalone, but cannot take its ownership or read its content through this role.

Institution membership never changes the account's global role, enrolls a person in
a class, or grants access to class posts, exams, answer keys or files. The catalogue
shows class metadata; its class link appears only for existing classroom members.
Existing class join policies remain in force.

Removing/demoting a teaching institution member detaches their owned classes from
the institution. Classes, ownership, enrolled students and coursework remain intact.
Departing students retain their existing classroom memberships. Removing a department
or semester in use is refused; reassign the classes first.

Migration 56 adds separate institution tables without modifying classroom rows.
Association versions survive detachment to reject stale updates after reattachment.
Roll back with its down migration only after deploying compatible application code;
the down migration removes organization metadata, never classroom data.
