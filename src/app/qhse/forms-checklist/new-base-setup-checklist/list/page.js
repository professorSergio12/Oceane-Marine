import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import NewBaseSetupChecklistListPage from "./NewBaseSetupChecklistListPage";

export default function NewBaseSetupChecklistListPageWrapper() {
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
              Loading new base setup checklist list page…
            </p>
          </div>
        }
      >
        <NewBaseSetupChecklistListPage />
      </Suspense>
    </div>
  );
}
