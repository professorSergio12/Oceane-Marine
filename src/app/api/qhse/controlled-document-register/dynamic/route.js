import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";

import SubContractorAudit from "@/lib/mongodb/models/qhse-due-diligence/SubContractorAudit";
import SupplierDueDiligence from "@/lib/mongodb/models/qhse-due-diligence/SupplierDueDiligence";
import STSBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import STSTransferAudit from "@/lib/mongodb/models/qhse-form-checklist/StsTransferAudit";
import HSEInductionChecklist from "@/lib/mongodb/models/qhse-form-checklist/HseInductionChecklist";
import VendorApproval from "@/lib/mongodb/models/qhse-form-checklist/VendorSupplierApproval";
import STSEquipmentBaseStock from "@/lib/mongodb/models/qhse-form-checklist/StsEquipmentBaseStockLevel";
import STSTransferLocationQuest from "@/lib/mongodb/models/qhse-form-checklist/StsTransferLocationQuest";
import NewBaseSetupChecklist from "@/lib/mongodb/models/qhse-form-checklist/NewBaseSetupChecklist";
import MOCManagementChange from "@/lib/mongodb/models/qhse-moc/mocs-managementChange";
import MOCRiskAssessment from "@/lib/mongodb/models/qhse-moc/mocs-riskAssessment";
import AuditInspectionPlanner from "@/lib/mongodb/models/qhse-audit-inspection/AuditInspectionPlanner";
import PoacCrossCompetency from "@/lib/mongodb/models/qhse-poac/PoacCrossCompetency";
import TargetKpi from "@/lib/mongodb/models/qhse-kpi/TargetKpi";
import KpiUpload from "@/lib/mongodb/models/qhse-kpi/KpiUpload";
import EquipmentDefect from "@/lib/mongodb/models/qhse-defect/EquipmentDefect";
import RiskAssessment from "@/lib/mongodb/models/qhse-risk-assessment/RiskAssessment";
import TrainingPlan from "@/lib/mongodb/models/qhse-training/TrainingPlan";
import TrainingRecord from "@/lib/mongodb/models/qhse-training/TrainingRecord";
import DrillPlan from "@/lib/mongodb/models/qhse-drill/DrillPlan";
import DrillReport from "@/lib/mongodb/models/qhse-drill/DrillReport";
import NearMiss from "@/lib/mongodb/models/qhse-near-miss/NearMiss";
import BestPractice from "@/lib/mongodb/models/qhse-best-practices/BestPractice";

/**
 * Each entry: formCode, title (from the QHSE register), the Mongoose model,
 * and the href to the list page in the QHSE module.
 */
const REGISTER_ENTRIES = [
  { formCode: "QAF-OFD-003", title: "STS Transfer Audit Report", model: STSTransferAudit, href: "/qhse/forms-checklist/transfer-audit/list" },
  { formCode: "QAF-OFD-004", title: "STS Base Audit Report", model: STSBaseAuditReport, href: "/qhse/forms-checklist/base-audit/list" },
  { formCode: "QAF-OFD-006", title: "Risk Assessment", model: RiskAssessment, href: "/qhse/risk-assessment/list" },
  { formCode: "QAF-OFD-008", title: "HSE Induction Checklist", model: HSEInductionChecklist, href: "/qhse/forms-checklist/hse-induction-checklist/list" },
  { formCode: "QAF-OFD-009", title: "POAC Cross Competency Evaluation", model: PoacCrossCompetency, href: "/qhse/poac/cross-competency/list" },
  { formCode: "QAF-OFD-013", title: "STS Equipment Base Stock Level", model: STSEquipmentBaseStock, href: "/qhse/forms-checklist/equipment-base-stock-level/list" },
  { formCode: "QAF-OFD-015", title: "Near Miss / Incident Reporting", model: NearMiss, href: "/qhse/near-miss" },
  { formCode: "QAF-OFD-025", title: "Equipment Defect List", model: EquipmentDefect, href: "/qhse/defects-list/create/list" },
  { formCode: "QAF-OFD-037", title: "Vendor / Supplier Approval Form", model: VendorApproval, href: "/qhse/forms-checklist/vendor-supply/list" },
  { formCode: "QAF-OFD-038", title: "Training Plan", model: TrainingPlan, href: "/qhse/training/create/plan" },
  { formCode: "QAF-OFD-039", title: "Training Record", model: TrainingRecord, href: "/qhse/training/create/plan" },
  { formCode: "QAF-OFD-040", title: "Drill Plan", model: DrillPlan, href: "/qhse/drills/create/plan" },
  { formCode: "QAF-OFD-043", title: "Supplier Due Diligence Questionnaire", model: SupplierDueDiligence, href: "/qhse/due-diligence-subconstructor/due-diligence-questionnaire/questionnaire-list-admin" },
  { formCode: "QAF-OFD-048", title: "Audit & Inspection Plan", model: AuditInspectionPlanner, href: "/qhse/audit-inspection-planner/list" },
  { formCode: "QAF-OFD-049", title: "STS Transfer Location Questionnaire", model: STSTransferLocationQuest, href: "/qhse/forms-checklist/transfer-location-quest/list" },
  { formCode: "QAF-OFD-051", title: "New Base Setup Checklist", model: NewBaseSetupChecklist, href: "/qhse/forms-checklist/new-base-setup-checklist/list" },
  { formCode: "QAF-OFD-055", title: "Audit Form - Sub Contractor", model: SubContractorAudit, href: "/qhse/due-diligence-subconstructor/audit-sub-contractor/list-admin" },
  { formCode: "QAF-OFD-058", title: "Management of Change Form", model: MOCManagementChange, href: "/qhse/moc/management-change/list" },
  { formCode: "QAF-OFD-058A", title: "MOC Risk Assessment", model: MOCRiskAssessment, href: "/qhse/moc/risk-assessment/list" },
  { formCode: "HSE-001A", title: "Target KPI", model: TargetKpi, href: "/qhse/kpi/target-kpi/list" },
  { formCode: "HSE-001B", title: "KPI (HSE Objectives Upload)", model: KpiUpload, href: "/qhse/kpi/list" },
  { formCode: "—", title: "Best Practices", model: BestPractice, href: "/qhse/best-practice/list" },
];

async function getStats(Model) {
  try {
    const count = await Model.countDocuments();
    if (count === 0) return { count: 0, latestDate: null };
    const latest = await Model.findOne().sort({ updatedAt: -1 }).select("updatedAt").lean();
    return { count, latestDate: latest?.updatedAt || null };
  } catch {
    return { count: 0, latestDate: null };
  }
}

export async function GET() {
  await connectDB();

  try {
    const results = await Promise.all(
      REGISTER_ENTRIES.map(async (entry) => {
        const stats = await getStats(entry.model);
        return {
          formCode: entry.formCode,
          title: entry.title,
          href: entry.href,
          documentCount: stats.count,
          lastUpdated: stats.latestDate,
        };
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Dynamic controlled document register error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
