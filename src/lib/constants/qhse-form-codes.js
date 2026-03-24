/**
 * QHSE Form Codes – fixed codes per form type.
 *
 * Rules:
 * - formCode: same for every instance of that form (e.g. Subcontractor Audit = OPS-OFD-212).
 * - Instance identity: serialNumber = YYYY-NNN (year + sequence for that form in that year).
 * - revisionNo: new form = 1.0; revisions = 1.1, 1.2, etc.
 *
 * Module keys must match the keys used in YearwiseSerialCounter (getNextYearwiseSerial).
 * Fill in the form code for each form type below.
 *
 * FULL LIST – Form type (sidebar)              | Module key                  | Form code
 * --------------------------------------------|-----------------------------|---------------
 * Audit Form - Sub Contractor                  | SUB_CONTRACTOR_AUDIT         | QAF-OFD-055
 * Supplier Due Diligence Q're                   | SUPPLIER_DUE_DILIGENCE      | QAF-OFD-043
 * STS Base Audit Report                        | STS_BASE_AUDIT               | QAF-OFD-004
 * Transfer Audit                               | STS_TRANSFER_AUDIT           | QAF-OFD-003
 * HSE Induction Checklist                      | HSE_INDUCTION_CHECKLIST      | QAF-OFD-008
 * Vendor/Supplier/Contractor                    | VENDOR_SUPPLIER_APPROVAL     | QAF-OFD-037
 * STS Equipment Base Stock Level               | STS_EQUIPMENT_BASE_STOCK     | QAF-OFD-013
 * Transfer Location Questionnaire               | STS_TRANSFER_LOCATION_QUEST  | QAF-OFD-049
 * New Base Setup Checklist                      | NEW_BASE_SETUP               | QAF-OFD-051
 * Management Of Change (MOC)                    | MOC_MANAGEMENT_CHANGE        | QAF-OFD-058
 * MOC Risk Assessment                           | MOC_RISK_ASSESSMENT          | QAF-OFD-058A
 * Audits & inspection planner                   | AUDIT_INSPECTION_PLANNER     | QAF-OFD-048
 * POAC cross competency                         | POAC_CROSS_COMPETENCY        | QAF-OFD-009
 * Target KPI                                    | TARGET_KPI                   | HSE-001A
 * KPI (HSE Objectives upload)                   | KPI_UPLOAD                   | HSE-001B
 * Best practices                                | BEST_PRACTICE                | (missing)
 * Defects list                                  | EQUIPMENT_DEFECT             | QAF-OFD-025
 * Risk Assessment (main)                        | RISK_ASSESSMENT              | QAF-OFD-006
 * Training Plan / Matrix                        | TRAINING_PLAN                | QAF-OFD-038
 * Training Record                               | TRAINING_RECORD              | QAF-OFD-039
 * Drill Plan                                    | DRILL_PLAN                   | QAF-OFD-040
 * Drill Report                                  | DRILL_REPORT                 | QAF-OFD-040
 * Near-miss reporting                           | NEAR_MISS                    | QAF-OFD-015
 */
export const QHSE_FORM_CODES = {
  // Due diligence / subcontractor audits
  SUB_CONTRACTOR_AUDIT: "QAF-OFD-055",
  SUPPLIER_DUE_DILIGENCE: "QAF-OFD-043",

  // Forms & checklist
  STS_BASE_AUDIT: "QAF-OFD-004",
  STS_TRANSFER_AUDIT: "QAF-OFD-003",
  HSE_INDUCTION_CHECKLIST: "QAF-OFD-008",
  VENDOR_SUPPLIER_APPROVAL: "QAF-OFD-037",
  STS_EQUIPMENT_BASE_STOCK: "QAF-OFD-013",
  STS_TRANSFER_LOCATION_QUEST: "QAF-OFD-049",
  NEW_BASE_SETUP: "QAF-OFD-051",

  // MOC
  MOC_MANAGEMENT_CHANGE: "QAF-OFD-058",
  MOC_RISK_ASSESSMENT: "QAF-OFD-058A",

  // Audits & inspection
  AUDIT_INSPECTION_PLANNER: "QAF-OFD-048",

  // POAC, KPI, etc.
  POAC_CROSS_COMPETENCY: "QAF-OFD-009",
  TARGET_KPI: "HSE-001A",
  KPI_UPLOAD: "HSE-001B",

  // Other QHSE
  BEST_PRACTICE: "QAF-BP",
  EQUIPMENT_DEFECT: "QAF-OFD-025",
  RISK_ASSESSMENT: "QAF-OFD-006",
  TRAINING_PLAN: "QAF-OFD-038",
  TRAINING_RECORD: "QAF-OFD-039",
  DRILL_PLAN: "QAF-OFD-040",
  DRILL_REPORT: "QAF-OFD-040",
  NEAR_MISS: "QAF-OFD-015",
};

/**
 * Get the fixed form code for a QHSE form type.
 * @param {string} moduleKey - Key from QHSE_FORM_CODES (e.g. "SUB_CONTRACTOR_AUDIT")
 * @returns {string} Form code (e.g. "OPS-OFD-212") or empty string if not set
 */
export function getQhseFormCode(moduleKey) {
  return QHSE_FORM_CODES[moduleKey] ?? "";
}
