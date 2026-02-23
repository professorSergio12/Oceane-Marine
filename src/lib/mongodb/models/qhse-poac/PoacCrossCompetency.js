import mongoose from "mongoose";
import { getNextYearwiseSerial } from "../YearwiseSerialCounter";
import { getQhseFormCode } from "../../../constants/qhse-form-codes";

/* =========================
   EVALUATION ITEM SCHEMA
========================= */
const EvaluationItemSchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      required: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
    },

    evaluation: {
      type: String,
      enum: [1, 2, 3, 4, 5],
      default: null,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const PoacCrossCompetencySchema = new mongoose.Schema(
  {
    parentOperationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PoacCrossCompetency",
    },

    isLatest: {
      type: Boolean,
      default: true,
    },

    /** Fixed form code (e.g. QAF-OFD-009) */
    formCode: { type: String },

    /** Year-wise document serial: YYYY-NNN (e.g. 2026-001) */
    serialNumber: { type: String },

    /* -------- Required -------- */
    nameOfPOAC: {
      type: String,
      required: true,
      trim: true,
    },

    evaluationDate: {
      type: Date,
      required: true,
    },

    jobRefNo: {
      type: String,
      required: true,
      trim: true,
    },

    leadPOAC: {
      type: String,
      required: true,
      trim: true,
    },

    /* -------- Optional -------- */
    dischargingVessel: { type: String, trim: true },
    receivingVessel: { type: String, trim: true },
    location: { type: String, trim: true },
    typeOfOperation: { type: String, trim: true },
    weatherCondition: { type: String, trim: true },

    deadweightDischarging: { type: Number },
    deadweightReceiving: { type: Number },

    /** Revision: 1.0 = new; 1.1, 1.2, ... on update. Set by create/update routes. */
    revNo: {
      type: String,
      default: "1.0",
    },

    /** Set when document is revised (on update). */
    revDate: { type: Date },

    /** Set when document is approved (e.g. in main app). */
    approvedBy: { type: String, trim: true },

    evaluationItems: {
      type: [EvaluationItemSchema],
      required: true,
    },

    /* -------- Comments -------- */
    leadPOACComment: { type: String, trim: true },
    leadPOACName: { type: String, trim: true },
    leadPOACDate: { type: Date },
    leadPOACSignature: { type: String, trim: true },

    opsSupportTeamComment: { type: String, trim: true },

    opsTeamName: { type: String, trim: true },
    opsTeamDate: { type: Date },
    opsTeamSignature: { type: String, trim: true },

    opsTeamSupdtName: { type: String, trim: true },
    opsTeamSupdtDate: { type: Date },
    opsTeamSupdtSignature: { type: String, trim: true },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Reviewed", "Approved"],
      default: "Draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PoacCrossCompetencySchema.pre("save", async function () {
  if (this.isNew) {
    if (!this.formCode) {
      this.formCode = getQhseFormCode("POAC_CROSS_COMPETENCY") || null;
    }
    if (!this.serialNumber) {
      this.serialNumber = await getNextYearwiseSerial("POAC_CROSS_COMPETENCY");
    }
  }
});

const PoacCrossCompetency =
  mongoose.models.PoacCrossCompetency ||
  mongoose.model("PoacCrossCompetency", PoacCrossCompetencySchema);

export default PoacCrossCompetency;
