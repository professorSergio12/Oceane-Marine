import { Suspense } from "react";
import HrSidebar from "../components/HrSidebar";
import SideBarSkeleton from "../components/SideBarSkeleton";

export default function OilMajorsPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <Suspense fallback={<SideBarSkeleton />}>
        <HrSidebar />
      </Suspense>
      <div className="flex-1 min-w-0 transition-all duration-300 md:pl-72">
        <div className="mx-auto py-8 space-y-6 px-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md">
            <h2 className="text-2xl font-bold text-white mb-4">Oil Majors</h2>
            <p className="text-white/60">This module is coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
