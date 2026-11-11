"use client";
import * as UI from "@/components/Icons";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { reportClientError } from "@/lib/client-report";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const tc = useTranslations("common");
  useEffect(() => reportClientError(error), [error]);
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface/80 p-8 backdrop-blur">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/15 text-3xl ring-1 ring-amber-400/30 text-amber-500" aria-hidden><UI.AlertIcon width={28} height={28} /></span>
        <h1 className="display text-xl font-bold">{tc("error")}</h1>
        {error.digest && <p className="font-mono text-xs text-muted">Ref: {error.digest}</p>}
        <button type="button" className="btn-primary min-h-12 px-8" onClick={reset} aria-label="Retry">↻</button>
      </div>
    </div>
  );
}
