import mongoose from "mongoose";

const fileAttachmentSchema = {
  fileUrl: { type: String, default: "" },
  originalFileName: { type: String, default: "" },
};

const equipmentSchema = new mongoose.Schema(
  {
    equipmentCode: { type: String, required: true, unique: true },
    equipmentName: { type: String, required: true },
    equipmentType: { type: String, trim: true, default: "" },

    specification: String,
    manufacturer: String,
    yearOfManufacturing: Number,

    ownershipType: {
      type: String,
      enum: ["OWNED", "THIRD_PARTY"],
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "RETIRED"],
      default: "ACTIVE"
    },

    isInUse: { type: Boolean, default: false },

    dateOfPurchase: Date,
    firstUseDate: Date,

    lastTestDate: Date,
    nextTestDate: Date,

    retirementPeriodYears: { type: Number, default: 10 },
    dateToBeRetired: Date,
    manufacturingCertificate: fileAttachmentSchema,
    testCertificate: fileAttachmentSchema,
    remarks: String
  },
  { timestamps: true }
);


export default mongoose.models.Equipment ||
  mongoose.model("Equipment", equipmentSchema);
