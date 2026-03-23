"use client";

import { QhseSidebarProvider } from "./QhseSidebarContext";
import { QhseLoadingProvider, useQhseLoading } from "./QhseLoadingContext";
import QhseLoadingOverlay from "./components/QhseLoadingOverlay";

function QhseLayoutInner({ children }) {
  const { pageLoading } = useQhseLoading();
  return (
    <div
      className={`relative min-h-screen bg-transparent text-white pt-6 transition-all duration-300 ${
        pageLoading ? "blur-sm pointer-events-none" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function QhseLayoutClient({ children }) {
  return (
    <QhseLoadingProvider>
      <QhseSidebarProvider>
        <QhseLayoutInner>{children}</QhseLayoutInner>
        <QhseLoadingOverlay />
      </QhseSidebarProvider>
    </QhseLoadingProvider>
  );
}
