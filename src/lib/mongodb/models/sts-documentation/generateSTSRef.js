import Counter from "@/models/generateFormCode";

export async function generateSTSRef(operationStartTime) {

  const year = new Date(operationStartTime).getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { key: "STS_OPERATION", year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqNumber = String(counter.seq).padStart(3, "0");

  return `${year}-${seqNumber}`;
}
