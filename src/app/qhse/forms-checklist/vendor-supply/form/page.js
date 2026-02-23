"use client";

import { Suspense } from "react";
import QhseSidebar from "../../../components/QhseSidebar";
import VendorSupplyFormClient from "./VendorSupplyFormClient";
import SideBarSkeleton from "../../../components/SideBarSkeleton";

export default function VendorSupplyFormPage() {
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
            <p className="text-white/60">Loading form...</p>
          </div>
        }
      >
        <VendorSupplyFormClient />
      </Suspense>
    </div>
  );
}
