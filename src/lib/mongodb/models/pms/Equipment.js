import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);


const equipmentSchema = new mongoose.Schema(
  {
    equipmentCode: { type: String, required: true, unique: true },
    equipmentName: { type: String, required: true },
    equipmentType: { type: String, required: true },

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
    certificates: [certificateSchema],
    remarks: String
  },
  { timestamps: true }
);


export default mongoose.models.Equipment ||
  mongoose.model("Equipment", equipmentSchema);
