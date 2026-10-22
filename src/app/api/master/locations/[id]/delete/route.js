import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireOpsAdmin } from "@/lib/auth/requireOpsAdmin";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import Jpo from "@/lib/mongodb/models/operations-form-checklist/Jpo";
import InspectionChecklist from "@/lib/mongodb/models/operations-form-checklist/InspectionChecklist";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import LocationOfficeCheck from "@/lib/mongodb/models/operations/operations-locations/LocationOfficeCheck";

/** Records that reference a Location; deleting it would leave them with a dangling location. */
const LOCATION_USAGES = [
  { model: StsOperation, field: "location", label: "STS operation" },
  { model: Compatibility, field: "location.locationId", label: "compatibility record" },
  { model: Jpo, field: "location.locationId", label: "JPO" },
  { model: InspectionChecklist, field: "location.locationId", label: "inspection checklist" },
  { model: StsBaseAuditReport, field: "location.locationId", label: "STS base audit report" },
  { model: LocationOfficeCheck, field: "locationId", label: "office check record" },
];

export async function DELETE(req, { params }) {
  try {
    const { response } = await requireOpsAdmin();
    if (response) return response;

    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const location = await Location.findById(id);
    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const counts = await Promise.all(
      LOCATION_USAGES.map(({ model, field }) => model.countDocuments({ [field]: location._id }))
    );
    const usedBy = LOCATION_USAGES
      .map(({ label }, i) => ({ label, count: counts[i] }))
      .filter((u) => u.count > 0);

    if (usedBy.length > 0) {
      const summary = usedBy
        .map(({ label, count }) => `${count} ${label}${count === 1 ? "" : "s"}`)
        .join(", ");
      return NextResponse.json(
        {
          error: `"${location.name}" can't be deleted because it is used by ${summary}.`,
          usedBy,
        },
        { status: 409 }
      );
    }

    await Location.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
