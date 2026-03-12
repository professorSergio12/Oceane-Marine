import KpiListClient from "./KpiListPage";
import { Suspense } from "react";
import QhseSidebar from "../../components/QhseSidebar";
import SideBarSkeleton from "../../components/SideBarSkeleton";

export default function KpiListPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar */}
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>

      {/* Main content */}
      <Suspense
        fallback={
          <div className="flex-1 ml-0 md:ml-0 md:ml-[300px] flex items-center justify-center">
            <p className="text-white/60">Loading KPI list…</p>
          </div>
        }
      >
        <KpiListClient />
      </Suspense>
    </div>
  );
}
