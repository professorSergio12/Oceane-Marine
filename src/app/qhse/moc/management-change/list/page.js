import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import MOCManagementChangeListPage from "./MOCManagementChangeListPage.js";

export default function MOCManagementChangeListPageWrapper() {
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
              Loading MOC management change list page…
            </p>
          </div>
        }
      >
        <MOCManagementChangeListPage />
      </Suspense>
    </div>
  );
}
