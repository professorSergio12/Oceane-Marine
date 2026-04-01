"use client";

import { useEffect } from "react";
import { HrSidebarProvider } from "./HrSidebarContext";
import { HrLoadingProvider, useHrLoading } from "./HrLoadingContext";
import LoadingOverlay from "./components/LoadingOverlay";
import { useAuthStore } from "@/store/authStore";

function ContentWrapper({ children }) {
  const { pageLoading } = useHrLoading();
  return (
    <div className={`relative min-h-screen bg-transparent text-white pt-6 transition-all duration-300 ${pageLoading ? 'blur-sm pointer-events-none' : ''}`}>
      {children}
    </div>
  );
}

export default function HrLayoutClient({ children }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <HrLoadingProvider>
      <HrSidebarProvider>
        <ContentWrapper>
          {children}
        </ContentWrapper>
        <LoadingOverlay />
      </HrSidebarProvider>
    </HrLoadingProvider>
  );
}
