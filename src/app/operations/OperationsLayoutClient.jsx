"use client";

import { useEffect } from "react";
import { OperationsLoadingProvider, useOperationsLoading } from "./OperationsLoadingContext";
import { OperationsSidebarProvider, useOperationsSidebar } from "./OperationsSidebarContext";
import LoadingOverlay from "./components/LoadingOverlay";
import { useAuthStore } from "@/store/authStore";

function ContentWrapper({ children }) {
  const { pageLoading } = useOperationsLoading();
  return (
    <div className={`relative min-h-screen bg-transparent text-white pt-6 transition-all duration-300 ${pageLoading ? 'blur-sm pointer-events-none' : ''}`}>
      {children}
    </div>
  );
}

export default function OperationsLayoutClient({ children }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
