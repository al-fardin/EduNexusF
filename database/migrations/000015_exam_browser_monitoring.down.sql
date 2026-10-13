-- Destructive rollback; do not run unless you intend to erase monitoring evidence.
DROP TABLE IF EXISTS classroom_exam_monitor_events;
DROP TABLE IF EXISTS classroom_exam_monitor_heartbeats;
DROP TABLE IF EXISTS classroom_exam_monitor_policy;
