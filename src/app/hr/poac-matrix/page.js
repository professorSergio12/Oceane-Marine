"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PoacMatrixFormPage from "./form/PoacMatrixFormPage";
import PoacMatrixListPage from "./list/PoacMatrixListPage";
import HrSidebarWrapper from "../components/HrSidebarWrapper";
import { useHrSidebar } from "../HrSidebarContext";
import { useHrLoading } from "../HrLoadingContext";

function PoacMatrixContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("form");
  const { contentClassName, isSidebarOpen } = useHrSidebar();
  const { setPageLoading } = useHrLoading();

  // Check for tab and edit in URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    const edit = searchParams.get("edit");
    if (tab === "list") {
      setActiveTab("list");
    } else if (edit) {
      setPageLoading(true);
      setActiveTab("form");
    }
  }, [searchParams, setPageLoading]);

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <HrSidebarWrapper />
      <div className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className="w-full mx-auto py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6 px-3 sm:px-4">
          <header className="mt-12 md:mt-0 mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Left: Dashboard Button */}
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition flex-shrink-0"
            >
              ← Dashboard
            </Link>
            
            {/* Center: Heading */}
            <div className="flex-1 flex flex-col items-center text-center w-full sm:w-auto">
              <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-sky-300">
                HR / POAC Matrix
              </p>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">POAC Matrix</h1>
            </div>
            
            {/* Right: Form/List Tabs */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 self-end sm:self-auto">
              <div className="inline-flex rounded-lg sm:rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    activeTab === "form"
                      ? "text-white bg-orange-500 hover:bg-orange-600"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    activeTab === "list"
                      ? "text-white bg-orange-500 hover:bg-orange-600"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          {activeTab === "form" && (
            <PoacMatrixFormPage 
              onSuccess={() => {
                setActiveTab("list");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("refreshPoacMatrix"));
                }
              }} 
            />
          )}
          {activeTab === "list" && <PoacMatrixListPage onRefresh={() => setActiveTab("list")} />}
        </div>
      </div>
    </div>
  );
}

export default function PoacMatrixPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <PoacMatrixContent />
    </Suspense>
  );
}
