import Link from "next/link";
import { setupOpen } from "@/actions/setup";
import { SetupForm } from "./form";

export const metadata = { title: "First-time setup" };
export const dynamic = "force-dynamic";

export default async function Setup() {
  const open = await setupOpen();
  return (
    <div className="grid min-h-dvh place-items-center bg-midnight p-4">
      {open ? (
        <SetupForm />
      ) : (
        <div className="card w-full max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold">Setup is done</h1>
          <p className="text-sm text-muted">An admin account already exists. Add more staff from Admin → Staff.</p>
          <Link href="/admin/login" className="btn-primary">Staff sign in</Link>
        </div>
      )}
    </div>
  );
}
