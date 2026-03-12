import mongoose from "mongoose";

/* Reusable sub-schema for file attachments */
const fileAttachmentSchema = {
  fileUrl: { type: String, default: "" },
  originalFileName: { type: String, default: "" },
};

const poacMatrixRowSchema = new mongoose.Schema({
  stsServiceProvider: {
    type: String,
    required: true,
  },
  poacName: {
    type: String,
    required: true,
  },
  validPassport: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  validPassportFile: fileAttachmentSchema,
  validMastersCOC: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  validMastersCOCFile: fileAttachmentSchema,
  dangerousCargoEndorsementOil: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementOilFile: fileAttachmentSchema,
  dangerousCargoEndorsementChem: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementChemFile: fileAttachmentSchema,
  dangerousCargoEndorsementGas: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementGasFile: fileAttachmentSchema,
  oilSpillResponseTraining: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  oilSpillResponseTrainingFile: fileAttachmentSchema,
  stsSimulatorTraining: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  stsSimulatorTrainingFile: fileAttachmentSchema,
  vesselSizeLimitations: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  vesselSizeLimitationsFile: fileAttachmentSchema,
  underwayOperations: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  underwayOperationsFile: fileAttachmentSchema,
  validMedicals: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  validMedicalsFile: fileAttachmentSchema,
  experienceWithOceane: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
    default: "",
  },
  attachment: {
    fileUrl: {
      type: String,
      default: "",
    },
    originalFileName: String,
  },
});

const poacMatrixSchema = new mongoose.Schema(
  {
    rows: {
      type: [poacMatrixRowSchema],
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

// Delete cached model to ensure schema changes are picked up during hot reload
if (mongoose.models.PoacMatrix) {
  delete mongoose.models.PoacMatrix;
}

export default mongoose.model("PoacMatrix", poacMatrixSchema);
