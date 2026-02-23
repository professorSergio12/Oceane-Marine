import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import VendorSupplyAdminPage from "./VendorSupplyAdminPage";

export default function VendorSupplyAdminPageWrapper() {
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
              Loading vendor supply admin page…
            </p>
          </div>
        }
      >
        <VendorSupplyAdminPage />
      </Suspense>
    </div>
  );
}
