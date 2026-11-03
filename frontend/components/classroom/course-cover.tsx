export function CourseCover({ id }: { id: string }) {
  const variant =
    Array.from(id).reduce(
      (hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0,
      2166136261,
    ) % 3;
  const gradient = `cover-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className={`en-course-cover en-cover-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 360 190" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--cover-a)" />
            <stop offset="1" stopColor="var(--cover-b)" />
          </linearGradient>
          <linearGradient id={`${gradient}-fold`} x1="0" x2=".8" y1="0" y2="1">
            <stop offset="0" stopColor="var(--cover-c)" />
            <stop offset="1" stopColor="var(--cover-d)" />
          </linearGradient>
        </defs>
        <rect width="360" height="190" fill={`url(#${gradient})`} />
        {variant === 0 ? (
          <>
            <path d="M0 0H360L178 190Z" fill="var(--cover-a)" />
            <path d="M360 0V190H178Z" fill={`url(#${gradient}-fold)`} />
            <path
              d="M0 190L178 104L272 190Z"
              fill="var(--cover-c)"
              opacity=".65"
            />
          </>
        ) : variant === 1 ? (
          <>
            <path d="M0 108L360 0V70L0 177Z" fill={`url(#${gradient}-fold)`} />
            <path d="M0 179L360 72V133L168 190H0Z" fill="var(--cover-c)" />
            <path d="M168 190L360 134V190Z" fill="var(--cover-d)" />
          </>
        ) : (
          <>
            <path d="M0 134L160 44L360 131L201 190H0Z" fill="var(--cover-c)" />
            <path d="M160 44V190L360 131Z" fill={`url(#${gradient}-fold)`} />
            <path d="M0 134L160 44V190H0Z" fill="var(--cover-a)" opacity=".5" />
            <path
              d="M360 40L237 96L360 150Z"
              fill="var(--cover-d)"
              opacity=".7"
            />
          </>
        )}
      </svg>
    </div>
  );
}
