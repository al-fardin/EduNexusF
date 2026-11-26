import { GraduationCap } from "lucide-react";

export function AuthBrand() {
  return (
    <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus">
      <div className="en-auth-art-mark">
        <GraduationCap size={32} aria-hidden="true" />
        EduNexus
      </div>
      <div>
        <h2>Classes, exams<br />and coursework.</h2>
      </div>
    </aside>
  );
}
