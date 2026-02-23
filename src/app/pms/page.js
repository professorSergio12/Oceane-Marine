"use client";

import { useState, useEffect, useRef } from "react";
import Certifications from "./certifications/Certifications";
import EquipmentTesting from "./equipment-testing/EquipmentTesting";
import PrimaryEquipment from "./equipment-inventory/primary-equipment/PrimaryEquipment";
import Accessories from "./equipment-inventory/accessories/Accessories";
import WarehouseManagement from "./warehouse-management/WarehouseManagement";
const sidebarTabs = [
  {
    key: "equipment-inventory",
    label: "Equipment Inventory",
    submodules: [
      {
        key: "primary-equipment",
        label: "Primary Equipment",
        href: "/pms/primary-equipment",
      },
      {
        key: "accessories",
        label: "Accessories",
        href: "/pms/accessories",
      },
    ],
  },
  {
    key: "certifications",
    label: "Certifications",
    href: "/pms/certifications",
  },
  {
    key: "equipment-testing",
    label: "Equipment Testing",
    href: "/pms/equipment-testing",
  },
  {
    key: "warehouse-management",
    label: "Warehouse Management",
  },
];

export default function PmsPage() {
  const [activeTab, setActiveTab] = useState("equipment-inventory");
  const [activeSubmodule, setActiveSubmodule] = useState("primary-equipment");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarRef = useRef(null);
  const [primaryEquipmentTab, setPrimaryEquipmentTab] = useState("form"); // "form" | "list" | "history"
  const [accessoriesView, setAccessoriesView] = useState("form"); // "form" | "list"
  const [warehouseView, setWarehouseView] = useState("form"); // "form" | "list"
  const [certificationsView, setCertificationsView] = useState("form"); // "form" | "list"

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full bg-slate-900/98 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ width: "280px" }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Navigation</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition"
              aria-label="Close sidebar"
            >
              <span className="text-white text-lg">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {sidebarTabs.map((tab) => (
                <div key={tab.key}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.submodules && tab.submodules.length > 0) {
                        setActiveSubmodule(tab.submodules[0].key);
                      }
                    }}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${activeTab === tab.key
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                        : "text-white/90 hover:bg-white/10 hover:text-white border border-white/5"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{tab.label}</span>
                      {tab.submodules && (
                        <span className={`text-xs transition-transform ${activeTab === tab.key ? "rotate-90" : ""
                          }`}>
                          ▶
                        </span>
                      )}
                    </div>
                  </button>

                  {tab.submodules && activeTab === tab.key && (
                    <div className="ml-4 mt-2 space-y-1 pl-4 border-l-2 border-orange-500/30">
                      {tab.submodules.map((sub) => (
                        <button
                          key={sub.key}
                          onClick={() => setActiveSubmodule(sub.key)}
                          className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${activeSubmodule === sub.key
                              ? "bg-white/20 text-white border-orange-400/50 shadow-md"
                              : "text-white/80 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10"
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-xs">▸</span>
                            {sub.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10 shadow-lg"
          aria-label="Open sidebar"
        >
          <span className="text-white text-xl">☰</span>
        </button>
      )}

      {/* Main Content */}
      <div
        className="flex-1 ml-0 md:ml-[280px] transition-all duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                  PMS
                </p>
                <h1 className="text-2xl font-bold">Preventive Maintenance</h1>
              </div>
            </div>

            {/* Form / List / History switch for Primary Equipment – kept outside the form */}
            {activeTab === "equipment-inventory" &&
              activeSubmodule === "primary-equipment" && (
                <div className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-500/40 p-1 shadow-md">
                  <button
                    type="button"
                    onClick={() => setPrimaryEquipmentTab("form")}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                      primaryEquipmentTab === "form"
                        ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryEquipmentTab("list")}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                      primaryEquipmentTab === "list"
                        ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryEquipmentTab("history")}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                      primaryEquipmentTab === "history"
                        ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    History
                  </button>
                </div>
              )}

            {/* Form / List switch for Accessories – kept outside the form */}
            {activeTab === "equipment-inventory" &&
              activeSubmodule === "accessories" && (
                <div className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-500/40 p-1 shadow-md">
                  <button
                    onClick={() => {
                      setAccessoriesView("form");
                    }}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                      accessoriesView === "form"
                        ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    Form
                  </button>
                  <button
                    onClick={() => {
                      setAccessoriesView("list");
                    }}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                      accessoriesView === "list"
                        ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    List
                  </button>
                </div>
              )}

                   {/* Form / List switch for Warehouse Management */}
           {activeTab === "warehouse-management" && (
             <div className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-500/40 p-1 shadow-md">
               <button
                 onClick={() => setWarehouseView("form")}
                 className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                   warehouseView === "form"
                     ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                     : "text-slate-200 hover:text-white"
                 }`}
               >
                 Form
               </button>
               <button
                 onClick={() => setWarehouseView("list")}
                 className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                   warehouseView === "list"
                     ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                     : "text-slate-200 hover:text-white"
                 }`}
               >
                 List
               </button>
             </div>
           )}

           {/* Form / List switch for Certifications */}
           {activeTab === "certifications" && (
             <div className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-500/40 p-1 shadow-md">
               <button
                 onClick={() => setCertificationsView("form")}
                 className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                   certificationsView === "form"
                     ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                     : "text-slate-200 hover:text-white"
                 }`}
               >
                 Form
               </button>
               <button
                 onClick={() => setCertificationsView("list")}
                 className={`px-6 py-2 text-sm font-semibold rounded-full transition ${
                   certificationsView === "list"
                     ? "bg-orange-500 text-white shadow shadow-orange-500/40"
                     : "text-slate-200 hover:text-white"
                 }`}
               >
                 List
               </button>
             </div>
           )}
           </header>

          {/* Tab Content */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
            {activeTab === "equipment-inventory" &&
              activeSubmodule === "primary-equipment" && (
                <PrimaryEquipment
                  activeTab={primaryEquipmentTab}
                  onChangeTab={setPrimaryEquipmentTab}
                />
              )}
            {activeTab === "equipment-inventory" && activeSubmodule === "accessories" && (
              <Accessories
                view={accessoriesView}
                onViewChange={setAccessoriesView}
              />
            )}
            {activeTab === "warehouse-management" && (
            <WarehouseManagement
              view={warehouseView}
              onViewChange={setWarehouseView}
            />
          )}
            {activeTab === "certifications" && (
              <Certifications
                view={certificationsView}
                onViewChange={setCertificationsView}
              />
            )}
            {activeTab === "equipment-testing" && <EquipmentTesting />}
            
          </div>
        </div>
      </div>
    </div>
  );
}