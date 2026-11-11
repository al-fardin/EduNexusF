DROP TABLE classroom_announcement_drafts;
DELETE FROM classroom_topic_resources WHERE resource_kind='exam';
ALTER TABLE classroom_topic_resources DROP CONSTRAINT classroom_topic_resources_resource_kind_check;
ALTER TABLE classroom_topic_resources ADD CONSTRAINT classroom_topic_resources_resource_kind_check CHECK(resource_kind IN ('assignment','material'));
