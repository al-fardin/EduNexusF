-- Only a newly created, disposable recovery database; never apply to user data.
INSERT INTO users(id,email,username,password_hash,first_name,last_name)
 VALUES('11111111-1111-4111-8111-111111111111','restore@example.invalid','restore_fixture',crypt('RecoveryFixture_2026!',gen_salt('bf')),'Restore','Check');
INSERT INTO classrooms(id,owner_id,name,class_code)
 VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Recovery fixture','RSTR01');
INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status)
 VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','teacher','active') ON CONFLICT DO NOTHING;
INSERT INTO classroom_materials(classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type)
 VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Recovery material','recovery.txt','33333333-3333-4333-8333-333333333333',17,'text/plain');
INSERT INTO users(id,email,username,password_hash,first_name,last_name)
 VALUES('77777777-7777-4777-8777-777777777777','student@example.invalid','restore_student','fixture','Student','Check');
INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll)
 VALUES('22222222-2222-4222-8222-222222222222','77777777-7777-4777-8777-777777777777','student','active','001');
INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high)
 VALUES('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777');
INSERT INTO classroom_messages(conversation_id,sender_id,client_request_id,body,file_name,file_size,media_type,storage_key,file_hash)
 VALUES('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','66666666-6666-4666-8666-666666666666','','recovery.txt',16,'text/plain','44444444-4444-4444-8444-444444444444',encode(digest('recovery message','sha256'),'hex'));

INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id)
 SELECT classroom_id,uploaded_by,'material',title,'Recovery content','material',id FROM classroom_materials;
INSERT INTO classroom_assignments(id,classroom_id,created_by,title,due_at,max_points,status)
 VALUES('88888888-8888-4888-8888-888888888888','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Recovery assignment',now()+interval '1 day',100,'published');
INSERT INTO classroom_assignment_submissions(id,assignment_id,student_id,version,request_id,answer,file_name,file_bytes)
 VALUES('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777',1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Recovery answer','submission.txt',convert_to('recovery submission','UTF8'));
INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions)
 VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Recovery exam',now(),now()+interval '1 day',30,'published','[{"id":"q","kind":"mcq","prompt":"Choose one","points":5,"options":["A","B"],"correct_option":0}]');
