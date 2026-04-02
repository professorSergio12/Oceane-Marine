"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminPanel from "@/app/dashboard/components/AdminPanel";
import { useAuthStore } from "@/store/authStore";

export default function AdminPage() {
  const router = useRouter();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="flex min-h-screen text-white"
      style={{ backgroundColor: "#08334f" }}
    >
      {/* Left rail — same navy family as page bg (no harsh black strip) */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#051e2e] via-[#062a40] to-[#08334f] shadow-[4px_0_24px_-4px_rgba(0,0,0,0.35)] sm:w-56">
        <div className="border-b border-white/10 px-4 py-4">
          <img
            src="/image/logo.png"
            alt="Ocean Group Logo"
            className="mb-3 h-14 w-auto max-w-full object-contain object-left brightness-110 contrast-110 drop-shadow-md sm:h-[4.5rem] md:h-20"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/70">
            Administration
          </p>
        </div>

        <nav className="sidebar-scrollbar-dark flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <Link
            href="/dashboard"
            className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Dashboard
          </Link>
          <div className="mt-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-sm font-medium text-sky-100">
            User management
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-center border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm sm:py-4 md:px-6">
          <h1 className="text-center text-base font-bold tracking-tight text-white sm:text-lg md:text-2xl">
            ADMIN PANEL
          </h1>
        </header>

        <main className="sidebar-scrollbar-dark flex-1 overflow-y-auto px-3 py-4 sm:px-4 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/35 p-3 shadow-xl backdrop-blur-sm sm:rounded-3xl sm:p-4 md:bg-slate-900/50 md:p-6">
              <AdminPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
