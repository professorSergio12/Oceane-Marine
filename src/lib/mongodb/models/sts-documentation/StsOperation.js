import mongoose from "mongoose";

/* ======================================================
   EQUIPMENT USAGE SUB SCHEMA
====================================================== */

const equipmentUsageSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: Date,

    usedHours: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["IN_USE", "RELEASED"],
      default: "IN_USE",
    },
  },
  { _id: false }
);


/* ======================================================
   DOCUMENT STORAGE SUB SCHEMA
====================================================== */

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      trim: true
    },

    filePath: {
      type: String,
      required: true,
      trim: true
    },

    checklistId: {
      type: mongoose.Schema.Types.ObjectId
    },

    source: {
      type: String,
      enum: [
        "SYSTEM_GENERATED",   // PDF from Agenda
        "MANUAL_UPLOAD",      // Admin Upload
        "AUTO_LOCATION"       // Auto from Location Master
      ],
      default: "SYSTEM_GENERATED"
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    },

    status: {
      type: String,
      enum: ["PENDING", "GENERATING", "GENERATED", "FAILED"],
      default: "GENERATED"
    }
  },
  { _id: false }
);


/* ======================================================
   MAIN STS OPERATION SCHEMA
====================================================== */

const stsOperationSchema = new mongoose.Schema(
  {
    /* ================= VERSION CONTROL ================= */

    parentOperationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    version: {
      type: Number,
      default: 1
    },

    isLatest: {
      type: Boolean,
      default: true
    },


    /* ================= CORE OPERATION ================= */

    Operation_Ref_No: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    typeOfOperation: String,

    mooringMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MooringMaster"
    },

    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },

    client: String,


    /* ================= OPERATION STATUS ================= */

    operationStatus: {
      type: String,
      enum: ["INPROGRESS", "COMPLETED", "CANCELED", "Lined Up"],
      default: "Lined Up"
    },

    isSubmitted: {
      type: Boolean,
      default: false,
      index: true
    },

    submittedAt: {
      type: Date
    },


    /* ================= TIMINGS ================= */

    operationStartTime: {
      type: Date,
      required: true,
      index: true
    },

    operationEndTime: Date,


    /* ================= OPERATION CONFIG ================= */

    flowDirection: {
      type: String,
      enum: ["left", "right", "both"],
      default: "left"
    },

    operationType: {
      type: String,
      enum: ["underway", "At Anchor"]
    },


    /* ================= VESSEL INFO ================= */

    loa: {
      type: String
    },

    vesselTypeCHS: {
      type: String,
      enum: [
        "VLCC",
        "ULCC",
        "Suexmax",
        "Aframax",
        "panamax",
        "post-panamax",
        "Handysize",
        "Capezie",
        "Supramax"
      ]
    },

    vesselTypeMS: {
      type: String,
      enum: [
        "VLCC",
        "ULCC",
        "Suexmax",
        "Aframax",
        "panamax",
        "post-panamax",
        "Handysize",
        "Capezie",
        "Supramax"
      ]
    },


    /* ================= CARGO ================= */

    quantity: Number,

    typeOfCargo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoType"
    },


    /* ================= EQUIPMENT USAGE ================= */

    equipments: {
      type: [equipmentUsageSchema],
      default: []
    },


    /* ================= DOCUMENT STORAGE  ================= */

    documents: {
      type: [documentSchema],
      default: []
    },


    /* ================= ADDITIONAL INFO ================= */

    chs: String,
    ms: String,
    remarks: String,


    /* ================= AUDIT ================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }

  },
  {
    timestamps: true
  }
);


/* ======================================================
   INDEXES (PERFORMANCE)
====================================================== */

stsOperationSchema.index({ Operation_Ref_No: 1 }, { unique: true });
stsOperationSchema.index({ operationStartTime: -1 });
stsOperationSchema.index({ operationStatus: 1 });
stsOperationSchema.index({ "equipments.equipment": 1 });
stsOperationSchema.index({ location: 1 });


/* ======================================================
   EXPORT MODEL
====================================================== */

export default mongoose.models.StsOperation ||
  mongoose.model("StsOperation", stsOperationSchema);
