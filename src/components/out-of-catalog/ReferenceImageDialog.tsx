import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOCK_DESCRIPTIONS = [
  "Rack-mounted Fortinet firewall, 1U chassis with dual redundant power supplies, front-facing console port and 8 SFP+ uplinks. Status LEDs all green.",
  "Front view of a 1U network appliance — black brushed metal bezel, branding center-left, ventilation grilles on both sides, mounting ears installed.",
  "Active equipment, single rack unit, multiple copper Ethernet ports with link-state indicators lit; serial label partially visible on the lower right.",
];

export interface ReferenceImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImage: string | null;
  initialDescription: string;
  onConfirm: (image: string | null, description: string) => void;
}

export function ReferenceImageDialog({
  open,
  onOpenChange,
  initialImage,
  initialDescription,
  onConfirm,
}: ReferenceImageDialogProps) {
  const [image, setImage] = useState<string | null>(initialImage);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setImage(initialImage);
      setDescription(initialDescription);
      if (initialImage && !initialDescription) generate(initialImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const generate = (src: string | null) => {
    if (!src) return;
    setLoading(true);
    window.setTimeout(() => {
      const next =
        MOCK_DESCRIPTIONS[Math.floor(Math.random() * MOCK_DESCRIPTIONS.length)];
      setDescription(next);
      setLoading(false);
    }, 1400);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setDescription("");
    generate(url);
  };

  const handleRemove = () => {
    setImage(null);
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-white/10 p-0 text-foreground"
        style={{ background: "#1E1E1E", fontFamily: "Roboto, sans-serif" }}
      >
        <DialogHeader className="border-b border-white/10 px-5 py-3">
          <DialogTitle className="text-sm font-medium">
            Reference image
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1.1fr_1fr] gap-0">
          {/* Image */}
          <div className="flex flex-col gap-3 border-r border-white/10 p-4">
            <div
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md"
              style={{ background: "#121212" }}
            >
              {image ? (
                <img src={image} alt="reference" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-xs">No image</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm transition hover:bg-white/[0.04]"
                style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={!image}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#3BB6E9" }} />
              <span>AI generated description</span>
            </div>

            {loading ? (
              <div
                className="flex flex-1 flex-col items-start justify-center gap-3 rounded-md border border-white/10 p-4"
                style={{ background: "#121212", minHeight: 220 }}
              >
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ background: "#3BB6E9" }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: "#3BB6E9" }}
                    />
                  </span>
                  Gemini is generating a description…
                </div>
                <div className="w-full space-y-2">
                  <div className="h-2 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-2 w-11/12 animate-pulse rounded bg-white/10" />
                  <div className="h-2 w-9/12 animate-pulse rounded bg-white/10" />
                  <div className="h-2 w-8/12 animate-pulse rounded bg-white/10" />
                </div>
              </div>
            ) : (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={image ? "Describe what's in the image…" : "Upload an image to generate a description"}
                className="min-h-[220px] flex-1 resize-none rounded-md border border-white/10 p-3 text-sm leading-relaxed outline-none transition focus:border-[#3BB6E9]"
                style={{ background: "#121212", color: "rgba(255,255,255,0.87)" }}
              />
            )}

            {!loading && image ? (
              <button
                type="button"
                onClick={() => generate(image)}
                className="self-start text-xs underline-offset-2 hover:underline"
                style={{ color: "#3BB6E9" }}
              >
                Regenerate with Gemini
              </button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 px-5 py-3">
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
            onClick={() => {
              onConfirm(image, description);
              onOpenChange(false);
            }}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#3BB6E9", color: "#0b1418" }}
          >
            Confirm
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
