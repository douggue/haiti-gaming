import { AdminLoginForm } from "./form";

export const metadata = { title: "Staff sign in" };

export default function AdminLogin() {
  return (
    <div className="grid min-h-dvh place-items-center bg-midnight p-4">
      <AdminLoginForm />
    </div>
  );
}
