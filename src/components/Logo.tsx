/** Uploaded logo (Settings → Brand images) or the built-in mark: a controller with Haiti's blue and red buttons in a rounded tile. */
export function Logo({ className = "", src, darkSrc, alt = "Haiti Gaming" }: { className?: string; src?: string; darkSrc?: string; alt?: string }) {
  if (src) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={`h-8 w-auto max-w-[160px] object-contain ${darkSrc ? "dark:hidden" : ""}`} />
        {darkSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={darkSrc} alt={alt} className="hidden h-8 w-auto max-w-[160px] object-contain dark:block" />
        )}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden>
        <rect width="100" height="100" rx="24" style={{ fill: "var(--primary)" }} />
        <g fill="#fff">
          <rect x="12" y="34" width="76" height="34" rx="17" />
          <circle cx="27" cy="63" r="15" />
          <circle cx="73" cy="63" r="15" />
        </g>
        {/* Haiti's flag colours on the D-pad and buttons */}
        <path d="M24 47h5v-5h5v5h5v5h-5v5h-5v-5h-5z" fill="#00209F" />
        <circle cx="67" cy="46" r="4.2" fill="#D21034" />
        <circle cx="76" cy="53" r="4.2" fill="#D21034" />
        <circle cx="58" cy="53" r="4.2" fill="#00209F" />
        <circle cx="67" cy="60" r="4.2" fill="#00209F" />
      </svg>
      <span className="display text-[0.95rem] leading-none max-[349px]:sr-only min-[400px]:text-[1.1rem]">
        Haiti<span className="text-primary">Gaming</span>
      </span>
    </span>
  );
}
