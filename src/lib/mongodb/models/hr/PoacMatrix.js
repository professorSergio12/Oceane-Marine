import mongoose from "mongoose";

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
  validMastersCOC: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementOil: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementChem: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  dangerousCargoEndorsementGas: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  oilSpillResponseTraining: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  stsSimulatorTraining: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  vesselSizeLimitations: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  underwayOperations: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  validMedicals: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
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
