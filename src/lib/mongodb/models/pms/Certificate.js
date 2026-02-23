import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: true,
      index: true,
    },

    version: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    originalFileName: String,

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);
