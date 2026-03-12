"use client";

import { OperationsLoadingProvider, useOperationsLoading } from "./OperationsLoadingContext";
import { OperationsSidebarProvider, useOperationsSidebar } from "./OperationsSidebarContext";
import LoadingOverlay from "./components/LoadingOverlay";

function ContentWrapper({ children }) {
  const { pageLoading } = useOperationsLoading();
  return (
    <div className={`relative min-h-screen bg-transparent text-white pt-6 transition-all duration-300 ${pageLoading ? 'blur-sm pointer-events-none' : ''}`}>
      {children}
    </div>
  );
}

export default function OperationsLayoutClient({ children }) {
  return (
    <OperationsLoadingProvider>
      <OperationsSidebarProvider>
        <ContentWrapper>
          {children}
        </ContentWrapper>
        <LoadingOverlay />
      </OperationsSidebarProvider>
    </OperationsLoadingProvider>
  );
}
