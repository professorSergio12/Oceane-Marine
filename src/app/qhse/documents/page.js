import { Suspense } from "react";
import QhseSidebar from "../components/QhseSidebar";
import SideBarSkeleton from "../components/SideBarSkeleton";
import QhseSuspenseFallback from "../components/QhseSuspenseFallback";
import QhseDocumentsContent from "./QhseDocumentsContent";

export default function QhseDocumentsPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <Suspense fallback={<SideBarSkeleton />}>
        <QhseSidebar />
      </Suspense>
      <Suspense fallback={<QhseSuspenseFallback />}>
        <QhseDocumentsContent />
      </Suspense>
    </div>
  );
}
