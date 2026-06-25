import type { OocRow } from "./outOfCatalogTypes";

// Seed roughly mirrors the Figma reference screenshot, then we fan out
// to ~200 rows by varying detected times and rack-unit slots.

const EQUIPMENT = [
  { type: "Zebra", manufacturer: "Invalid", model: "Bla" },
  { type: "Cheeta", manufacturer: "LMK", model: "NY12" },
  { type: "Edge Router", manufacturer: "Invalid", model: "Bla" },
  { type: "Battery", manufacturer: "Ericson", model: "6630" },
  { type: "Macro Cell Antenna", manufacturer: "Huawei", model: "AAU5613" },
  { type: "Mounted Amplifier", manufacturer: "CommScope", model: "TMA-2000" },
  { type: "Shelter", manufacturer: "American Tower", model: "ATC FlexiShelter" },
  { type: "RRU", manufacturer: "Nokia", model: "AirScale" },
  { type: "Tower Light", manufacturer: "Flash Technology", model: "FTS 370x" },
  { type: "Cable Tray", manufacturer: "Andrew", model: "CT-19" },
];

const ACCOUNTS = ["Verizon", "Indara", "PTI", "Multiple", "AT&T", "T-Mobile"];

const RACK_SLOTS = [undefined, "1-5", "2-4", "2-6", "6-10", "9-11", "16-18", "18-20"];

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function fmt(d: Date) {
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function makeRows(): OocRow[] {
  const rows: OocRow[] = [];
  const seedDates = [
    new Date(2024, 5, 21, 23, 41, 2),
    new Date(2024, 1, 3, 8, 15, 43),
    new Date(2024, 2, 17, 19, 22, 9),
    new Date(2024, 3, 29, 0, 58, 31),
    new Date(2024, 2, 14, 22, 23, 54),
  ];

  for (let i = 0; i < 200; i++) {
    const eq = EQUIPMENT[i % EQUIPMENT.length];
    const account = ACCOUNTS[i % ACCOUNTS.length];
    const date = seedDates[i % seedDates.length];
    // Walk dates slightly so they aren't all identical
    const d = new Date(date.getTime() - i * 1000 * 60 * 37);
    const hasLink = i % 4 === 2;            // every 4th-ish row only has the link
    const isUnrecognized = i % 11 === 0;    // sprinkle "Unrecognized" rows
    const rackUnits = hasLink ? RACK_SLOTS[(i % (RACK_SLOTS.length - 1)) + 1] : RACK_SLOTS[i % RACK_SLOTS.length];

    rows.push({
      id: `ooc-${i + 1}`,
      detectedOn: fmt(d),
      status: isUnrecognized ? "Unrecognized" : "Pending",
      equipmentType: eq.type,
      manufacturer: eq.manufacturer,
      model: eq.model,
      instances: ((i * 3) % 15) + 1,
      rackUnits,
      account,
      hasLink,
    });
  }
  return rows;
}

export const mockOutOfCatalog: OocRow[] = makeRows();
