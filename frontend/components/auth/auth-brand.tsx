import { BrandMark, BrandWordmark } from "@/components/layout/brand-mark";

export function AuthBrand() {
  return (
    <>
      <div className="en-auth-mobile-brand"><BrandMark size={36} /><BrandWordmark /></div>
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus">
        <div className="en-auth-art-mark">
          <BrandMark size={44} />
          <BrandWordmark />
        </div>
        <div>
          <h2>Classes, exams<br />and coursework.</h2>
        </div>
      </aside>
    </>
  );
}
