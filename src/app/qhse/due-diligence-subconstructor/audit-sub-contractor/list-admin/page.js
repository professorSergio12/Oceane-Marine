import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import AuditSubContractorListAdminPage from "./AuditSubContractorListAdminPage";

export default function AuditSubContractorListAdminPageWrapper() {
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
              Loading audit sub-contractor list admin page…
            </p>
          </div>
        }
      >
        <AuditSubContractorListAdminPage />
      </Suspense>
    </div>
  );
}
