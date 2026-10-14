/** Uploaded logo (Settings → Brand images) or the built-in mark: a compact controller inside a rounded tile. */
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
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#1467F5" />
        <path d="M9.5 12h13a4.5 4.5 0 0 1 4.3 5.7l-.9 3.3a2.6 2.6 0 0 1-4.5 1l-1.9-2.2h-7l-1.9 2.2a2.6 2.6 0 0 1-4.5-1l-.9-3.3A4.5 4.5 0 0 1 9.5 12Z" fill="#fff" />
        <path d="M11 15.2v3M9.5 16.7h3" stroke="#1467F5" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20.5" cy="15.6" r="1.1" fill="#1467F5" />
        <circle cx="22.6" cy="17.7" r="1.1" fill="#1467F5" />
      </svg>
      <span className="text-[1.05rem] leading-none">
        Haiti<span className="text-primary">Gaming</span>
      </span>
    </span>
  );
}
