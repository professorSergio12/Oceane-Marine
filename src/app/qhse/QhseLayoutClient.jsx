"use client";

import GoToDashBoardButton from "../components/GoToDashBoardButton";
import { QhseSidebarProvider, useQhseSidebar } from "./QhseSidebarContext";

function QhseLayoutInner({ children }) {
  const { isSidebarOpen } = useQhseSidebar();
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-6">
      <GoToDashBoardButton
        offsetLeftPx={isSidebarOpen ? 316 : undefined}
        leftClassName={
          !isSidebarOpen
            ? "left-[max(1.5rem,calc((100vw-80rem)/2+3rem))]"
            : ""
        }
      />
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
