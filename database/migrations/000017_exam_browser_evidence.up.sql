-- Additional exam-scoped, consented content evidence. No legacy data changed.
ALTER TABLE classroom_exam_monitor_events ADD COLUMN IF NOT EXISTS event_text TEXT;
ALTER TABLE classroom_exam_monitor_events DROP CONSTRAINT IF EXISTS classroom_exam_monitor_events_event_kind_check;
ALTER TABLE classroom_exam_monitor_events ADD CONSTRAINT classroom_exam_monitor_events_event_kind_check
 CHECK (event_kind IN (
 'tab_switched','site_active','window_blur','window_focus','window_minimized',
 'exam_tab_closed','exam_tab_returned','extension_started','extension_stopped',
 'session_interruption','page_hidden','page_visible',
 'search_query','ai_prompt','external_copy','exam_paste'));
ALTER TABLE classroom_exam_monitor_events ADD CONSTRAINT classroom_exam_monitor_events_text_limit
 CHECK (event_text IS NULL OR char_length(event_text) <= 2000);
