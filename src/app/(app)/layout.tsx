import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/guard";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import type { Role } from "@/lib/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidSession();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user?.role ?? "OPERATOR") as Role;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} userName={session.user?.name ?? undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-[17px] pb-20 pt-[114px] sm:px-6 lg:px-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
