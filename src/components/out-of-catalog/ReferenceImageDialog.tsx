import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Trash2, Image as ImageIcon, Plus, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_IMAGES = 8;

const MOCK_DESCRIPTIONS = [
  "Rack-mounted Fortinet firewall, 1U chassis with dual redundant power supplies, front-facing console port and 8 SFP+ uplinks. Status LEDs all green.",
  "Front view of a 1U network appliance — black brushed metal bezel, branding center-left, ventilation grilles on both sides, mounting ears installed.",
  "Active equipment, single rack unit, multiple copper Ethernet ports with link-state indicators lit; serial label partially visible on the lower right.",
];

export interface ReferenceImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImages: string[];
  initialDescription: string;
  onConfirm: (images: string[], description: string) => void;
}

export function ReferenceImageDialog({
  open,
  onOpenChange,
  initialImages,
  initialDescription,
  onConfirm,
}: ReferenceImageDialogProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [activeIdx, setActiveIdx] = useState(0);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setImages(initialImages);
      setActiveIdx(0);
      setDescription(initialDescription);
      if (initialImages.length > 0 && !initialDescription) generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const generate = () => {
    setLoading(true);
    window.setTimeout(() => {
      const next =
        MOCK_DESCRIPTIONS[Math.floor(Math.random() * MOCK_DESCRIPTIONS.length)];
      setDescription(next);
      setLoading(false);
    }, 1400);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const accepted = files.slice(0, remaining).map((f) => URL.createObjectURL(f));
    const wasEmpty = images.length === 0;
    const next = [...images, ...accepted];
    setImages(next);
    if (wasEmpty) {
      setActiveIdx(0);
      setDescription("");
      generate();
    }
    // reset so same file can be re-picked
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    if (next.length === 0) {
      setActiveIdx(0);
      setDescription("");
    } else if (activeIdx >= next.length) {
      setActiveIdx(next.length - 1);
    } else if (idx < activeIdx) {
      setActiveIdx(activeIdx - 1);
    }
  };

  const makePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [images[idx], ...images.filter((_, i) => i !== idx)];
    setImages(next);
    setActiveIdx(0);
  };

  const canAdd = images.length < MAX_IMAGES;
  const activeImage = images[activeIdx] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-white/10 p-0 text-foreground"
        style={{ background: "#1E1E1E", fontFamily: "Roboto, sans-serif" }}
      >
        <DialogHeader className="border-b border-white/10 px-5 py-3">
          <DialogTitle className="flex items-center justify-between text-sm font-medium">
            <span>Reference images</span>
            <span className="text-xs font-normal text-white/50">
              {images.length} / {MAX_IMAGES}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1.1fr_1fr] gap-0">
          {/* Image */}
          <div className="flex flex-col gap-3 border-r border-white/10 p-4">
            <div
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md"
              style={{ background: "#121212" }}
            >
              {activeImage ? (
                <img src={activeImage} alt="reference" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-xs">No images yet</span>
                </div>
              )}
            </div>

            {/* Thumbs */}
            <div className="grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <div
                  key={src + i}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border transition"
                  style={{
                    borderColor: i === activeIdx ? "#3BB6E9" : "rgba(255,255,255,0.10)",
                    background: "#121212",
                  }}
                  onClick={() => setActiveIdx(i)}
                >
                  <img src={src} alt={`ref ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 ? (
                    <span
                      className="absolute left-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded"
                      style={{ background: "rgba(59,182,233,0.85)", color: "#0b1418" }}
                      title="Primary"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        makePrimary(i);
                      }}
                      className="absolute left-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded bg-black/60 text-white/70 opacity-0 transition group-hover:opacity-100 hover:text-white"
                      title="Set as primary"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(i);
                    }}
                    className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded bg-black/60 opacity-0 transition group-hover:opacity-100"
                    style={{ color: "#d97a72" }}
                    title="Remove"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {canAdd ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-md border border-dashed text-white/50 transition hover:border-[#3BB6E9] hover:text-[#3BB6E9]"
                  style={{ borderColor: "rgba(255,255,255,0.20)", background: "#121212" }}
                  title="Add images"
                >
                  <Plus className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />

            <div className="flex items-center justify-between text-[11px] text-white/45">
              <span>Click a thumb to preview · Star to set primary</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canAdd}
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: "#E0E0E0" }}
              >
                <Upload className="h-3 w-3" />
                Upload more
              </button>
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
                placeholder={images.length > 0 ? "Describe what's in the images…" : "Upload images to generate a description"}
                className="min-h-[220px] flex-1 resize-none rounded-md border border-white/10 p-3 text-sm leading-relaxed outline-none transition focus:border-[#3BB6E9]"
                style={{ background: "#121212", color: "rgba(255,255,255,0.87)" }}
              />
            )}

            {!loading && images.length > 0 ? (
              <button
                type="button"
                onClick={generate}
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
              onConfirm(images, description);
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
