import mongoose from "mongoose";

const statutoryCertificateSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
      index: true,
    },
    typeOfDocs: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: String,
      required: true,
      index: true,
    },
    validity: {
      type: Date,
      required: true,
    },
    attachment: {
      fileUrl: {
        type: String,
        required: true,
      },
      originalFileName: String,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.models.StatutoryCertificate ||
  mongoose.model("StatutoryCertificate", statutoryCertificateSchema);
