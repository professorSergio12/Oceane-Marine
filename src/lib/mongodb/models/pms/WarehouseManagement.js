import mongoose from "mongoose";

const WarehouseManagementSchema = new mongoose.Schema(
  {
    /* =========================
       LOCATION (FROM SIDEBAR)
    ========================== */
    location: {
      type: String,
      required: true,
      enum: [
        "FUJAIRAH",
        "DUBAI",
        "KHORFAKKAN",
        "AJMAN",
        "PORT_KHALIFA",
        "SOHAR",
        "MUSCAT",
        "DUQM",
        "SALALAH",
        "TANJUNG_BRUAS",
        "MOMBASA",
        "YEOSU"
      ],
      index: true
    },

    /* =========================
       INVENTORY SUMMARY
    ========================== */
    primaryFenders: { type: Number, default: 0 },
    secondaryFenders: { type: Number, default: 0 },
    hoses: { type: Number, default: 0 },

    ownership: {
      type: String,
      enum: ["OWNED", "THIRD_PARTY"],
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    },

    /* =========================
       EQUIPMENT MOVEMENT
    ========================== */
    equipment: { type: String, trim: true, required: true },
    nos: { type: Number, min: 0, required: true },

    startDate: Date,
    estimatedEndDate: Date,

    fromLocation: { type: String, trim: true },
    stopover: { type: String, trim: true },
    toLocation: { type: String, trim: true },

    /* =========================
       ATTACHMENTS (LOCAL FILES)
    ========================== */
    attachments: [
      {
        fileName: String,
        filePath: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    /* =========================
       REMARKS
    ========================== */
    remarks: { type: String, trim: true },

    /* =========================
       SYSTEM
    ========================== */
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.models.WarehouseManagement ||
  mongoose.model("WarehouseManagement", WarehouseManagementSchema);
