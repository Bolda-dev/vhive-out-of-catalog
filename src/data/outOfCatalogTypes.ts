export type OocStatus = "Pending" | "Unrecognized";

export interface OocRow {
  id: string;
  detectedOn: string;          // "DD-MM-YYYY HH:mm:ss"
  status: OocStatus;
  equipmentType: string;
  manufacturer: string;
  model: string;
  instances: number;
  rackUnits?: string;          // e.g. "1-5", "9-11" — optional
  account: string;             // "Verizon" | "Indara" | "PTI" | "Multiple" ...
  hasLink: boolean;            // when true, show external-link icon and no action buttons
}
