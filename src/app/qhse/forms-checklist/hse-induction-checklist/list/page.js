import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import HseInductionChecklistListPage from "./HseInductionChecklistListPage";

export default function HseInductionChecklistListPageWrapper() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar */}
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>

      {/* Main content */}
      <Suspense
        fallback={
          <div className="flex-1 ml-[300px] flex items-center justify-center">
            <p className="text-white/60">
              Loading hse induction checklist list page…
            </p>
          </div>
        }
      >
        <HseInductionChecklistListPage />
      </Suspense>
    </div>
  );
}
