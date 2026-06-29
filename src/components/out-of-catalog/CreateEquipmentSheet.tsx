import { useEffect, useState } from "react";
import { ChevronLeft, Pencil, Image as ImageIcon, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ReferenceImageDialog } from "./ReferenceImageDialog";

export interface CreateEquipmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvedCount: number;
  hasRejected: boolean;
  defaultImage: string | null;
  onSubmit: (payload: CreateEquipmentPayload) => void;
}

export interface CreateEquipmentPayload {
  category: string;
  classification: string;
  type: string;
  manufacturer: string;
  model: string;
  weightKg: string;
  heightU: string;
  widthM: string;
  depthM: string;
  powerW: string;
  thermalBtu: string;
  referenceImage: string | null;
  referenceImages: string[];

  referenceDescription: string;
}

const CLASSIFICATIONS = ["Active", "Passive", "Cabling", "Other"];
const TYPES = [
  "Switch",
  "Router",
  "Firewall",
  "Server",
  "PDU",
  "Patch Panel",
  "UPS",
  "KVM",
];
const KNOWN_MANUFACTURERS = [
  "Cisco",
  "Juniper",
  "Arista",
  "HPE",
  "Dell",
  "Fortinet",
  "Palo Alto",
  "Mellanox",
];

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.65)",
  fontSize: 12,
};

const inputClass =
  "h-10 w-full rounded-md border border-white/10 px-3 text-sm outline-none transition focus:border-[#3BB6E9]";
const inputStyle: React.CSSProperties = {
  background: "#121212",
  color: "rgba(255,255,255,0.87)",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
};

export function CreateEquipmentSheet({
  open,
  onOpenChange,
  approvedCount,
  hasRejected,
  defaultImage,
  onSubmit,
}: CreateEquipmentSheetProps) {
  const [category] = useState("Rack Mounted");
  const [classification, setClassification] = useState("");
  const [type, setType] = useState("");
  const [manufacturer, setManufacturer] = useState("Fortinet");
  const [model, setModel] = useState("Unknown");
  const [weightKg, setWeightKg] = useState("");
  const [heightU, setHeightU] = useState("");
  const [widthM, setWidthM] = useState("");
  const [depthM, setDepthM] = useState("");
  const [powerW, setPowerW] = useState("");
  const [thermalBtu, setThermalBtu] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>(
    defaultImage ? [defaultImage] : [],
  );
  const [referenceDescription, setReferenceDescription] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  useEffect(() => {
    if (open) setReferenceImages(defaultImage ? [defaultImage] : []);
  }, [open, defaultImage]);


  const manufacturerNotFound =
    manufacturer.trim().length > 0 &&
    !KNOWN_MANUFACTURERS.some(
      (m) => m.toLowerCase() === manufacturer.trim().toLowerCase(),
    );

  const canSubmit =
    classification &&
    type &&
    manufacturer.trim() &&
    model.trim() &&
    weightKg &&
    heightU &&
    widthM &&
    depthM;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      category,
      classification,
      type,
      manufacturer,
      model,
      weightKg,
      heightU,
      widthM,
      depthM,
      powerW,
      thermalBtu,
      referenceImage: referenceImages[0] ?? null,
      referenceImages,

      referenceDescription,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-[440px] flex-col gap-0 border-l border-white/10 p-0 sm:max-w-[440px]"
        style={{ background: "#1E1E1E", fontFamily: "Roboto, sans-serif" }}
      >
        {/* Header */}
        <SheetHeader className="border-b border-white/10 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-ml-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            Create Equipment
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {hasRejected ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
              style={{
                background: "rgba(242,208,102,0.08)",
                borderColor: "rgba(242,208,102,0.35)",
                color: "#F2D066",
              }}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Images marked "not part of the group" will be moved to a separate
                group and will not be bound to this new equipment.
              </span>
            </div>
          ) : null}

          {/* Reference images + description (read-only) */}
          <div className="mb-4">
            <div style={labelStyle} className="mb-1.5 flex items-center justify-between">
              <span>Reference images</span>
              <span className="text-[11px] text-white/40">
                {referenceImages.length} / 8
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex h-32 w-32 shrink-0 flex-col gap-1">
                <div
                  className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md border border-white/10"
                  style={{ background: "#121212" }}
                >
                  {referenceImages[0] ? (
                    <img
                      src={referenceImages[0]}
                      alt="primary reference"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-white/30" />
                  )}
                  {referenceImages.length > 1 ? (
                    <span
                      className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px]"
                      style={{ background: "rgba(0,0,0,0.65)", color: "#E0E0E0" }}
                    >
                      +{referenceImages.length - 1}
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto rounded-md border border-white/10 p-2.5 text-xs leading-relaxed"
                style={{
                  background: "#121212",
                  color: referenceDescription
                    ? "rgba(255,255,255,0.78)"
                    : "rgba(255,255,255,0.35)",
                  maxHeight: 128,
                }}
              >
                {referenceDescription || "No description yet. Click below to add one."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setImageDialogOpen(true)}
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition hover:bg-white/[0.04]"
              style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit images &amp; description
            </button>
          </div>


          {/* Fields */}
          <Field label="Category *">
            <input
              value={category}
              disabled
              className={inputClass + " disabled:opacity-60"}
              style={inputStyle}
            />
          </Field>

          <Field label="Classification *">
            <Select
              value={classification}
              onChange={setClassification}
              options={CLASSIFICATIONS}
              placeholder="Select"
            />
          </Field>

          <Field label="Type *">
            <Select
              value={type}
              onChange={setType}
              options={TYPES}
              placeholder="Select"
            />
          </Field>

          <Field label="Manufacturer *">
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className={inputClass}
              style={inputStyle}
              list="oc-manufacturers"
            />
            <datalist id="oc-manufacturers">
              {KNOWN_MANUFACTURERS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {manufacturerNotFound ? (
              <div
                className="mt-1 text-xs"
                style={{ color: "#d97a72" }}
              >
                Not found in the catalog list
              </div>
            ) : null}
          </Field>

          <Field label="Model *">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>

          <Field label="Weight (kg) *">
            <NumberInput value={weightKg} onChange={setWeightKg} />
          </Field>
          <Field label="Height (U) *">
            <NumberInput value={heightU} onChange={setHeightU} />
          </Field>
          <Field label="Width (m) *">
            <NumberInput value={widthM} onChange={setWidthM} />
          </Field>
          <Field label="Depth (m) *">
            <NumberInput value={depthM} onChange={setDepthM} />
          </Field>
          <Field label="Power Consumption (W)">
            <NumberInput value={powerW} onChange={setPowerW} />
          </Field>
          <Field label="Thermal Emission (BTU/hr)">
            <NumberInput value={thermalBtu} onChange={setThermalBtu} />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm transition hover:bg-white/[0.04]"
            style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#3BB6E9", color: "#0b1418" }}
          >
            Add New &amp; Bind ({approvedCount})
          </button>
        </div>

        <ReferenceImageDialog
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          initialImage={referenceImage}
          initialDescription={referenceDescription}
          onConfirm={(img, desc) => {
            setReferenceImage(img);
            setReferenceDescription(desc);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div style={labelStyle} className="mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      style={inputStyle}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass + " font-normal"}
      style={inputStyle}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o} style={{ background: "#1E1E1E" }}>
          {o}
        </option>
      ))}
    </select>
  );
}
