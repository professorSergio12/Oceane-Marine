import mongoose from "mongoose";

const AccessoriesSchema = new mongoose.Schema(
  {
    // Tabs
    category: {
      type: String,
      enum: ["REGULAR", "OCCASIONAL"],
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    // REGULAR only
    equipmentNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // IMPORTANT for conditional uniqueness
    },

    // Common
    equipmentName: {
      type: String,
      required: true,
      trim: true,
    },

    specification: {
      type: String,
      trim: true,
    },

    purchaseDate: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
    },

    // OCCASIONAL only
    quantity: {
      type: Number,
      min: 1,
    },

    // Usage
    putInUse: {
      type: Boolean,
      default: false,
    },

    putInUseDate: {
      type: Date,
    },

    // Placement
    placedIn: {
      type: String,
      enum: ["OFFICE", "BAY", "BASE"],
      required: true,
    },

    // System
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// IMPORTANT: all validation is now handled in the API route.
// This model intentionally has **no** pre-save hooks,
// to avoid any `next`-related issues with Mongoose middleware.

const AccessoriesModel =
  mongoose.models.Accessories || mongoose.model("Accessories", AccessoriesSchema);

export default AccessoriesModel;
