"use client";

import { QhseSidebarProvider, useQhseSidebar } from "./QhseSidebarContext";

function QhseLayoutInner({ children }) {
  const { isSidebarOpen } = useQhseSidebar();
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-6">
      {children}
    </div>
  );
}

export default function QhseLayoutClient({ children }) {
  return (
    <QhseSidebarProvider>
      <QhseLayoutInner>{children}</QhseLayoutInner>
    </QhseSidebarProvider>
  );
}
