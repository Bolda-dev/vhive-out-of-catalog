export type OocStatus = "Pending" | "Unrecognized";

export interface OocCapture {
  id: string;
  imageUrl: string;
  surveyId: string;
  capturedAt: string; // "DD-MM-YYYY HH:mm:ss"
  location: string;
  aiDescription: string;
}

export interface CatalogItem {
  id: string;
  type: string;
  manufacturer: string;
  model: string;
  category: string;
  classification: string;
  heightU: number;
  widthM: number;
  depthM: number;
  weightKg: number;
  powerW: number;
  thermalBtu: number;
  referenceImageUrl: string;
}

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
  // New (prototype enrichment)
  captures: OocCapture[];
  confidence: number;          // 0–100
  aiType: string;              // may be "" or "Invalid"
  aiManufacturer: string;
  aiModel: string;
  aiSuggestionId?: string;     // FK into mock catalog — top suggestion (legacy)
  aiSuggestions?: AiSuggestion[]; // ranked list of catalog candidates, high→low
}

export interface AiSuggestion {
  catalogId: string;
  matchScore: number; // 0-100
}
