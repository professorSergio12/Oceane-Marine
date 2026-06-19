/**
 * Maps each app module to the SharePoint folder(s) it should pull from.
 *
 * - `sharePointPath` : folder inside the document library (relative to its root)
 * - `subModule`      : the app submodule this folder belongs to (stored in Mongo)
 * - `keyPrefix`      : prefix for the object key in DigitalOcean Spaces
 *
 * The SharePoint folder structure under each path is MIRRORED as-is into Spaces
 * (so a 2022 file stays under 2022, a "Shell" folder stays under Shell, etc).
 */

export const SHAREPOINT_LIBRARY = "Oceane Group Filing";

/** Files we never migrate (Windows shortcuts, Access DB backups, system files). */
export const SKIP_EXTENSIONS = [".lnk", ".accdb", ".ini", ".tmp", ".db"];

/** Whole folders to skip even if encountered (junk / old backups). */
export const SKIP_FOLDER_NAMES = ["TEMP CAPT. B", "V - old laptop"];

export const MODULE_CONFIG = {
  hr: {
    label: "HR",
    folders: [
      {
        sharePointPath: "Y - Oil Majors",
        subModule: "oil-majors",
        keyPrefix: "HR/Oil-Majors",
      },
      {
        sharePointPath: "K - Oceane Group Statutory Cert",
        subModule: "statutory-certificates",
        keyPrefix: "HR/Statutory-Certificates",
      },
    ],
  },

  operations: {
    label: "Operations",
    folders: [
      {
        // Year folders (2022-2026) + named folders show directly at the root.
        sharePointPath: "Z - Operations",
        subModule: "sts-operations",
        keyPrefix: "Operations",
      },
    ],
  },

  pms: {
    label: "PMS",
    folders: [
      {
        sharePointPath: "Q - Equipments Inventory",
        subModule: "equipment-inventory",
        keyPrefix: "PMS/Equipment-Inventory",
      },
      {
        sharePointPath: "H - Equipment Certificates, Site Insp",
        subModule: "equipment-testing",
        keyPrefix: "PMS/Equipment-Certificates",
      },
      {
        sharePointPath: "R - PMS",
        subModule: "fender-maintenance",
        keyPrefix: "PMS/Fender-Maintenance",
      },
    ],
  },

  qhse: {
    label: "QHSE",
    folders: [
      {
        sharePointPath: "F - Quality",
        subModule: "quality",
        keyPrefix: "QHSE/Quality",
      },
      {
        sharePointPath: "B - Health & Safety",
        subModule: "health-safety",
        keyPrefix: "QHSE/Health-Safety",
      },
    ],
  },
};

export const getModuleConfig = (moduleKey) => MODULE_CONFIG[moduleKey] || null;

/** True if a file should be skipped based on its name/extension. */
export const shouldSkipFile = (fileName) => {
  const lower = fileName.toLowerCase();
  return SKIP_EXTENSIONS.some((ext) => lower.endsWith(ext));
};