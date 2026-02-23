import TargetKpiFormPage from "./TargetKpiFormPage";
import { Suspense } from "react";
import QhseSidebar from "@/app/qhse/components/QhseSidebar";
import SideBarSkeleton from "@/app/qhse/components/SideBarSkeleton";

export default function TargetKpiFormRoute() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex-1 ml-[300px] flex items-center justify-center">
            <p className="text-white/60">Loading…</p>
          </div>
        }
      >
        <TargetKpiFormPage />
      </Suspense>
    </div>
  );
}
