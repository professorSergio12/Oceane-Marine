import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Location from "@/lib/mongodb/models/Location";

/**
 * Copy the operation fields that the compatibility form auto-fills (ref no, year, location,
 * CHS → STBL name, MS → SS name) onto the compatibility record(s) of that operation.
 *
 * Every operation edit saves a new version with a new _id, so records are matched through
 * all versions of the operation (and, for records saved without a link, by the previous ref).
 * Ship particulars typed into the compatibility form (DWT, Beam, …) are never touched.
 *
 * @param {object} operation  the newly saved latest version (lean)
 * @param {string} previousRef the ref number before this edit
 * @returns {Promise<number>} number of compatibility records updated
 */
export async function syncCompatibilityFromOperation(operation, previousRef) {
  if (!operation?._id) return 0;

  const versionIds = await StsOperation.find({ parentOperationId: operation.parentOperationId }).distinct("_id");
  const match = [{ operationRef: { $in: versionIds } }];
  const oldRef = String(previousRef || "").trim();
  if (oldRef) match.push({ operationRef: null, operationNumber: oldRef });

  // Same rules as the compatibility form's auto-fill: only copy values that are set
  const set = { operationRef: operation._id };
  const ref = String(operation.Operation_Ref_No || "").trim();
  if (ref) set.operationNumber = ref;
  if (operation.operationStartTime) set.year = new Date(operation.operationStartTime).getFullYear();
  if (operation.location) {
    const loc = await Location.findById(operation.location).select("name").lean();
    if (loc) set.location = { locationId: loc._id, name: loc.name || "" };
  }
  if (operation.chs) set["STBL.name"] = operation.chs;
  if (operation.ms) set["SS.name"] = operation.ms;

  const result = await Compatibility.updateMany({ $or: match }, { $set: set });
  return result.modifiedCount || 0;
}
