import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import VendorSupplyListClient from "./VendorSupplyListClient";
import SideBarSkeleton from "../../../components/SideBarSkeleton";

export default function VendorSupplyListPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar */}
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>

      {/* Page Content */}
      <Suspense
        fallback={
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <p className="text-white/60">Loading vendor forms...</p>
          </div>
        }
      >
        <VendorSupplyListClient />
      </Suspense>
    </div>
  );
}
