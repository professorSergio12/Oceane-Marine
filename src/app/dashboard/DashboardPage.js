"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardTabs from "./components/DashboardTabs";

const tabs = [
  { key: "operations", label: "Operations" },
  { key: "pms", label: "PMS" },
  { key: "qhse", label: "QHSE" },
  { key: "accounts", label: "Accounts" },
  { key: "hr", label: "HR" },
];

const menuItems = [
  { key: "operations", label: "Operations", href: "/operations" },
  { key: "pms", label: "PMS", href: "/pms" },
  { key: "qhse", label: "QHSE", href: "/qhse/training/create/plan" },
  { key: "accounts", label: "Accounts", href: "/accounts" },
  { key: "hr", label: "HR", href: "/hr" },
];

const VALID_TABS = ["operations", "pms", "qhse", "accounts", "hr"];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL if valid, otherwise default to "operations"
    return tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "operations";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef(null);

  // Sync state when URL ?tab= changes externally (e.g. browser back/forward)
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL whenever activeTab changes (keeps URL in sync so refresh works)
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    router.replace(`/dashboard?tab=${tabKey}`, { scroll: false });
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const handleMenuClick = (item) => {
    setIsMenuOpen(false);
    router.push(item.href);
  };

  const cta = {
    operations: { label: "Go to Operations", href: "/operations" },
    pms: { label: "Go to PMS", href: "/pms" },
    qhse: { label: "Go to QHSE", href: "/qhse/training/create/plan" },
    accounts: { label: "Go to Accounts", href: "/accounts" },
    hr: { label: "Go to HR", href: "/hr" },
  }[activeTab];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#08334f" }}
    >
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/10 backdrop-blur-sm relative z-40">
        <div className="flex-1 flex items-center">
          <img
            src="/image/logo.png"
            alt="Ocean Group Logo"
            className="h-16 md:h-20 w-auto object-contain brightness-110 contrast-110 drop-shadow-lg"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-center flex-1">
          DASHBOARD
        </h1>
        <div
          className="flex-1 flex justify-end items-center gap-3 relative z-50"
          ref={menuRef}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <div className="h-8 w-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-semibold">
              U
            </div>
            <span className="text-sm cursor-pointer text-white/80">
              Profile
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full cursor-pointer bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 border border-white/15 hover:bg-white/20 transition"
          >
            Sign out
          </button>
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 shadow-lg"
            aria-label="Open menu"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-white transition-all"></span>
              <span className="block h-0.5 w-5 bg-white transition-all"></span>
              <span className="block h-0.5 w-5 bg-white transition-all"></span>
            </div>
          </button>
        </div>
      </header>

      {/* Full right-side sidebar menu - Outside header */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-9998 border-0 cursor-pointer"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
          />
          {/* Sidebar */}
          <div
            data-sidebar
            className="fixed right-0 top-0 h-full w-80 bg-slate-900/98 border-l border-white/20 shadow-2xl backdrop-blur-md z-9999"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                  aria-label="Close menu"
                >
                  <span className="text-white text-xl">×</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleMenuClick(item)}
                      className="w-full text-left px-6 py-4 rounded-xl text-base font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-150 hover:translate-x-2 border border-white/5 hover:border-white/20"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Tabs centered with light border separator - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block text-center pb-6 border-b border-white/5">
            <div className="flex items-center justify-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-105"
                      : "bg-white/5 text-white/90 hover:bg-white/10 hover:text-white hover:scale-105 border border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            {cta && (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-orange-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/50"
              >
                {cta.label}
              </Link>
            )}
          </div>

          <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </main>
    </div>
  );
}
