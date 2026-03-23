"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import QhseSidebarWrapper from "./components/QhseSidebarWrapper";
import QhseSuspenseFallback from "./components/QhseSuspenseFallback";
import { useQhseSidebar } from "./QhseSidebarContext";

const TrainingPlanForm = dynamic(() => import("./training/create/plan/page"), {
  ssr: false,
});

const TrainingRecordForm = dynamic(() => import("./training/create/record/page"), {
  ssr: false,
});

const DrillsPlanForm = dynamic(() => import("./drills/create/plan/page"), {
  ssr: false,
});

const DrillsReportForm = dynamic(() => import("./drills/create/report/page"), {
  ssr: false,
});

function QhsePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedSubmodule, setSelectedSubmodule] = useState(null);

  useEffect(() => {
    const module = searchParams.get("module");
    const submodule = searchParams.get("submodule");
    if (module) {
      setSelectedModule(module);
      setSelectedSubmodule(submodule || null);
    } else {
      // default: send user to training matrix
      router.replace("/qhse/training/create/plan");
      setSelectedModule("training");
      setSelectedSubmodule("plan");
    }
  }, [searchParams, router]);

 

  const { isSidebarOpen } = useQhseSidebar();
  // Render form inline based on selected module
  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <QhseSidebarWrapper />
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "md:pl-72" : ""}`}>
        {selectedModule === "training" && selectedSubmodule === "plan" && (
          <TrainingPlanForm hideSidebar={true} />
        )}
        {selectedModule === "training" && selectedSubmodule === "record" && (
          <TrainingRecordForm hideSidebar={true} />
        )}
        {selectedModule === "drills" && selectedSubmodule === "plan" && (
          <DrillsPlanForm hideSidebar={true} />
        )}
        {selectedModule === "drills" && selectedSubmodule === "report" && (
          <DrillsReportForm hideSidebar={true} />
        )}
      </div>
    </div>
  );
}

export default function QhsePage() {
  return (
    <Suspense fallback={<QhseSuspenseFallback />}>
      <QhsePageContent />
    </Suspense>
  );
}
