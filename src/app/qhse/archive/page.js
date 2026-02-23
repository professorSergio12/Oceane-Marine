import ArchivePage from "./ArchivePage";
import { Suspense } from "react";
import QhseSidebar from "../components/QhseSidebar";
import SideBarSkeleton from "../components/SideBarSkeleton";

export default function ArchiveRoute() {
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
        <ArchivePage />
      </Suspense>
    </div>
  );
}
