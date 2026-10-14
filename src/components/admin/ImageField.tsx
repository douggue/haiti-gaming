"use client";
import { useRef, useState } from "react";
import { uploadImage } from "@/actions/admin";

type Folder = "products" | "categories" | "brand";

async function upload(file: File, folder: Folder) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", folder);
  return uploadImage(fd);
}

/** Single image: uploads immediately, keeps the URL in a hidden input named `name`. */
export function ImageField({ name, label, value, folder, hint, aspect = "aspect-[4/3]" }: { name: string; label: string; value?: string | null; folder: Folder; hint?: string; aspect?: string }) {
  const [url, setUrl] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-start gap-3">
        <div className={`grid w-24 shrink-0 place-items-center sm:w-32 overflow-hidden rounded-xl border border-dashed border-border bg-surface-2 ${aspect}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">No image</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setError("");
              const r = await upload(f, folder);
              setBusy(false);
              if (r.ok) setUrl(r.url);
              else setError(r.error);
              if (input.current) input.current.value = "";
            }}
          />
          {busy && <p className="text-xs text-muted">Uploading…</p>}
          {url && <button type="button" className="text-xs text-danger underline" onClick={() => setUrl("")}>Remove image</button>}
          {hint && <p className="text-xs text-muted">{hint}</p>}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** Several images: each URL is submitted as a repeated hidden input named `name`. */
export function GalleryField({ name, label, value = [], folder, max = 8 }: { name: string; label: string; value?: string[]; folder: Folder; max?: number }) {
  const [urls, setUrls] = useState<string[]>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <span className="label">{label}</span>
      {urls.map((u) => <input key={u} type="hidden" name={name} value={u} />)}
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative h-20 w-24 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 text-[11px] text-white">
              <button type="button" disabled={i === 0} onClick={() => setUrls((p) => { const n = [...p]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>←</button>
              <button type="button" onClick={() => setUrls((p) => p.filter((x) => x !== u))}>✕</button>
            </div>
          </div>
        ))}
        {urls.length < max && (
          <label className={`grid h-20 w-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-xs text-muted ${busy ? "opacity-50" : ""}`}>
            {busy ? "…" : "+ Add"}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])].slice(0, max - urls.length);
                setBusy(true);
                setError("");
                for (const f of files) {
                  const r = await upload(f, folder);
                  if (r.ok) setUrls((p) => [...p, r.url]);
                  else setError(r.error);
                }
                setBusy(false);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
