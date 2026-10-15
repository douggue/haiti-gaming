/** Uploaded logo (Settings → Brand images) or the built-in mark: a controller half blue (red D-pad) and half red (blue buttons), with "Haiti" in blue and "Gaming" in red. */
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
        <defs>
          <clipPath id="hg-pad">
            <rect x="10" y="32" width="80" height="38" rx="19" />
            <circle cx="27" cy="64" r="16" />
            <circle cx="73" cy="64" r="16" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24" fill="#fff" />
        {/* Haiti's flag on the controller: blue half with a red D-pad, red half with blue buttons */}
        <g clipPath="url(#hg-pad)">
          <rect width="50" height="100" fill="#00209F" />
          <rect x="50" width="50" height="100" fill="#D21034" />
        </g>
        <path d="M22 48h6v-6h6v6h6v6h-6v6h-6v-6h-6z" fill="#D21034" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <g fill="#00209F" stroke="#fff" strokeWidth="1.5">
          <circle cx="68" cy="45" r="4.6" />
          <circle cx="77" cy="53" r="4.6" />
          <circle cx="59" cy="53" r="4.6" />
          <circle cx="68" cy="61" r="4.6" />
        </g>
      </svg>
      <span className="display text-[0.95rem] leading-none max-[349px]:sr-only min-[400px]:text-[1.1rem]">
        <span className="text-[#00209F] dark:text-[#5b86ff]">Haiti</span>
        <span className="text-[#D21034] dark:text-[#ff4d6a]">Gaming</span>
      </span>
    </span>
  );
}
