"use client";

import PropTypes from "prop-types";
import OperationsCharts from "./OperationsCharts";
import PMSCharts from "./PMSCharts";
import QHSECharts from "./QHSECharts";
import AccountCharts from "./AccountCharts";
import HrCharts from "./HrCharts";

const DashboardTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: "operations", label: "Operations" },
    { key: "pms", label: "PMS" },
    { key: "qhse", label: "QHSE" },
    { key: "accounts", label: "Accounts" },
    { key: "hr", label: "HR" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 md:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
        {activeTab === "operations" && <OperationsCharts />}
        {activeTab === "pms" && <PMSCharts />}
        {activeTab === "qhse" && <QHSECharts />}
        {activeTab === "accounts" && <AccountCharts />}
        {activeTab === "hr" && <HrCharts />}
      </div>
    </div>
  );
};

DashboardTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

export default DashboardTabs;
