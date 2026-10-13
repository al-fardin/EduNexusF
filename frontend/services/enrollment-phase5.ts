import { api } from "@/lib/api";

type Envelope<T> = { success: boolean; data: T };
export type CourseLookup = { id: string; name: string; course_code: string | null; section: string | null };
export type EnrollmentJoin = { classroom: { id: string }; student_roll: string };

export const enrollmentPhase5 = {
  async lookup(class_code: string): Promise<CourseLookup> {
    const response = await api.post<Envelope<CourseLookup>>("/classrooms/join/lookup", { class_code });
    return response.data.data;
  },
  async join(class_code: string, student_roll: string): Promise<EnrollmentJoin> {
    const response = await api.post<Envelope<EnrollmentJoin>>("/classrooms/join", { class_code, student_roll });
    return response.data.data;
  },
  async myRoll(classroomId: string): Promise<string | null> {
    const response = await api.get<Envelope<{ student_roll: string | null }>>(`/classrooms/${classroomId}/my-roll`);
    return response.data.data.student_roll;
  },
  async setMyRoll(classroomId: string, student_roll: string): Promise<string> {
    const response = await api.put<Envelope<{ student_roll: string }>>(`/classrooms/${classroomId}/my-roll`, { student_roll });
    return response.data.data.student_roll;
  },
  async courseCode(classroomId: string): Promise<string | null> {
    const response = await api.get<Envelope<{ course_code: string | null }>>(`/classrooms/${classroomId}/course-code`);
    return response.data.data.course_code;
  },
  async setCourseCode(classroomId: string, course_code: string): Promise<string> {
    const response = await api.put<Envelope<{ course_code: string }>>(`/classrooms/${classroomId}/course-code`, { course_code });
    return response.data.data.course_code;
  },
};
