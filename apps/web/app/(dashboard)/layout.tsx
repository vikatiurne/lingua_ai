import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <AppShell showThemeToggle={false}>
      <Header email={user.email} />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </AppShell>
  );
}
