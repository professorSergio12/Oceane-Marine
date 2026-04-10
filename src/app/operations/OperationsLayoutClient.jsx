"use client";

import { useEffect } from "react";
import { OperationsLoadingProvider, useOperationsLoading } from "./OperationsLoadingContext";
import { OperationsSidebarProvider } from "./OperationsSidebarContext";
import LoadingOverlay from "./components/LoadingOverlay";
import { useAuthStore } from "@/store/authStore";

const STS_DOCUMENTATION_BG = "/bg-image/operation/documentations.png";

function ContentWrapper({ children }) {
  const { pageLoading } = useOperationsLoading();
  return (
    <div className={`relative min-h-screen bg-transparent text-white pt-6 transition-all duration-300 ${pageLoading ? 'blur-sm pointer-events-none' : ''}`}>
      {/* Fixed blurred documentation backdrop for all operations pages */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat blur-sm"
          style={{ backgroundImage: `url('${STS_DOCUMENTATION_BG}')` }}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] bg-slate-950/70" aria-hidden />
      <div className="relative z-10">
        {children}
      </div>
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
