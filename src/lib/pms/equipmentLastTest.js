import EquipmentTest from "@/lib/mongodb/models/pms/EquipmentTest";

/**
 * Adds `lastTestDisplayDate` to each equipment (plain objects): the later of
 * the date entered on the equipment record (`lastTestDate`) and the most recent
 * COMPLETED test in Equipment Testing — completing a test doesn't update the record.
 */
export async function attachLastTestDates(equipments) {
  const list = (equipments || []).filter(Boolean);
  if (list.length === 0) return equipments;

  const latest = await EquipmentTest.aggregate([
    {
      $match: {
        equipment: { $in: list.map((e) => e._id) },
        status: "COMPLETED",
        testDate: { $ne: null },
      },
    },
    { $group: { _id: "$equipment", testDate: { $max: "$testDate" } } },
  ]);
  const byId = new Map(latest.map((t) => [String(t._id), t.testDate]));

  for (const eq of list) {
    const fromRecord = eq.lastTestDate ? new Date(eq.lastTestDate) : null;
    const fromTests = byId.get(String(eq._id)) || null;
    eq.lastTestDisplayDate =
      fromRecord && fromTests ? (fromRecord > fromTests ? fromRecord : fromTests) : fromRecord || fromTests;
  }
  return equipments;
}
