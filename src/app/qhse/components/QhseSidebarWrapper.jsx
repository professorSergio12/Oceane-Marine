"use client";

import { Suspense } from "react";
import QhseSidebar from "./QhseSidebar";

export default function QhseSidebarWrapper() {
  return (
    <Suspense fallback={
      <div className="fixed left-0 top-0 h-full w-[260px] sm:w-[300px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    }>
      <QhseSidebar />
    </Suspense>
  );
}


