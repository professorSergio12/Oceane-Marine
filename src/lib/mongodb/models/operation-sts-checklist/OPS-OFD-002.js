import mongoose from "mongoose";
import FormCounterStsCheckList from "./FormCounterStsCheckList.js";
// ================= DOCUMENT INFO =================
const DocumentInfoSchema = new mongoose.Schema({
    formNo: String,
    revisionNo: String,
    revisionDate: Date,
    approvedBy: String,
}, { _id: false });


// ================= TRANSFER INFO =================
const TransferInfoSchema = new mongoose.Schema({
    constantHeadingShip: String,
    manoeuvringShip: String,
    designatedPOACName: String,
    stsSuperintendentName: String,
    transferDate: Date,
    transferLocation: String
}, { _id: false });


// ================= CHECK ITEM =================
const CheckItemSchema = new mongoose.Schema({
    clNumber: Number,

    description: String,

    status: {
        type: String,
        enum: ["YES", "NO", "NOT_APPLICABLE"]
    },

    remarks: String

}, { _id: false });


// ================= SIGNATURE =================
const SignatureSchema = new mongoose.Schema({
    name: String,
    rank: String,
    signature: String, // base64 or cloud url
    date: Date
}, { _id: false });


// ================= MAIN SCHEMA =================
const STSChecklist2Schema = new mongoose.Schema({

    // ===== HEADER =====
    operationRef: {
        type: String,
        required: true,
        index: true
    },

    sequenceNumber: {
        type: String,
        unique: true,
        index: true
    },

    documentInfo: DocumentInfoSchema,


    // ===== TRANSFER DETAILS =====
    transferInfo: TransferInfoSchema,


    // ===== CHECKLIST ITEMS (CL 1 → 15) =====
    checklistItems: [
        CheckItemSchema
    ],


    // ===== SIGNATURE BLOCK =====
    signatureBlock: SignatureSchema,


    // ===== WORKFLOW =====
    status: {
        type: String,
        enum: ["DRAFT", "SUBMITTED", "APPROVED"],
        default: "DRAFT"
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, {
    timestamps: true
});

STSChecklist2Schema.pre("save", async function () {

    if (!this.isNew || this.sequenceNumber) return;

    const year = new Date(
        this.documentInfo?.revisionDate ||
        this.transferInfo?.transferDate ||
        Date.now()
    ).getFullYear();

    const counter = await FormCounterStsCheckList.findOneAndUpdate(
        {
            key: "STS_CHECKLIST_OPS-OFD-002",
            year
        },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const padded = String(counter.seq).padStart(3, "0");

    this.sequenceNumber = `${year}-${padded}`;
});


export default mongoose.models.STSChecklist2 ||
    mongoose.model("STSChecklist2", STSChecklist2Schema);
