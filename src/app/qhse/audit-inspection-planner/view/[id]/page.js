import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import AuditInspectionPlannerViewPage from "./AuditInspectionPlannerViewPage";

export default function AuditInspectionPlannerViewPageWrapper() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar */}
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>

      {/* Main content */}
      <Suspense
        fallback={
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <p className="text-white/60">
              Loading audit inspection planner view page…
            </p>
          </div>
        }
      >
        <AuditInspectionPlannerViewPage />
      </Suspense>
    </div>
  );
}
