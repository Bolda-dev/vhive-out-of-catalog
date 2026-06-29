import { useEffect, useRef, useState } from "react";
import { Sparkles, Trash2, Image as ImageIcon, Plus } from "lucide-react";
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

const THUMB_COLUMNS = 4;
const THUMB_GAP = 8;
const VISIBLE_THUMB_ROWS = 2.25;

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
  const thumbsWrapRef = useRef<HTMLDivElement>(null);
  const [thumbsMaxH, setThumbsMaxH] = useState<number>();
  const [thumbSize, setThumbSize] = useState<number>();

  useEffect(() => {
    if (open) {
      setImages(initialImages);
      setActiveIdx(0);
      setDescription(initialDescription);
      if (initialImages.length > 0 && !initialDescription) generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalSlots = images.length + 1; // include plus button
  const scrollThumbs = totalSlots > THUMB_COLUMNS * 2;

  useEffect(() => {
    const el = thumbsWrapRef.current;
    if (!el) return;

    const updateMaxHeight = () => {
      const availableWidth = el.clientWidth - (scrollThumbs ? 6 : 0);
      const nextThumbSize = Math.max(
        56,
        Math.floor((availableWidth - THUMB_GAP * (THUMB_COLUMNS - 1)) / THUMB_COLUMNS),
      );

      setThumbSize(nextThumbSize);

      if (!scrollThumbs) {
        setThumbsMaxH(undefined);
        return;
      }

      setThumbsMaxH(nextThumbSize * VISIBLE_THUMB_ROWS + THUMB_GAP * 2);
    };

    updateMaxHeight();
    const observer = new ResizeObserver(updateMaxHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollThumbs, open]);

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
    const accepted = files.map((f) => URL.createObjectURL(f));
    const wasEmpty = images.length === 0;
    const next = [...images, ...accepted];
    setImages(next);
    if (wasEmpty) {
      setActiveIdx(0);
      setDescription("");
      generate();
    }
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

  const activeImage = images[activeIdx] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100vh-48px)] max-w-3xl flex-col overflow-hidden border-white/10 p-0 text-foreground"
        style={{ background: "#1E1E1E", fontFamily: "Roboto, sans-serif" }}
      >
        <DialogHeader className="border-b border-white/10 px-5 py-3">
          <DialogTitle className="text-sm font-medium">
            Reference images
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-0 overflow-hidden">
          {/* Image */}
          <div className="flex min-h-0 flex-col gap-3 border-r border-white/10 p-4">
            <div
              className="relative flex aspect-square max-h-[46vh] w-full shrink-0 items-center justify-center overflow-hidden rounded-md"
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
            <div
              ref={thumbsWrapRef}
              className="custom-scrollbar grid shrink-0 gap-2 overflow-x-hidden"
              style={{
                gridTemplateColumns: `repeat(${THUMB_COLUMNS}, minmax(0, 1fr))`,
                gridAutoRows: thumbSize ? `${thumbSize}px` : undefined,
                maxHeight: thumbsMaxH,
                overflowY: scrollThumbs ? "auto" : "visible",
                paddingRight: scrollThumbs ? 6 : 0,
              }}
            >
              {images.map((src, i) => (
                <div
                  key={src + i}
                  data-thumb
                  className="group relative h-full min-h-0 w-full min-w-0 cursor-pointer overflow-hidden rounded-md border transition"
                  style={{
                    borderColor: i === activeIdx ? "#3BB6E9" : "rgba(255,255,255,0.10)",
                    background: "#121212",
                  }}
                  onClick={() => setActiveIdx(i)}
                >
                  <img src={src} alt={`ref ${i + 1}`} className="h-full w-full object-cover" />
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
              <button
                type="button"
                data-thumb
                onClick={() => fileRef.current?.click()}
                className="flex h-full min-h-0 w-full min-w-0 items-center justify-center rounded-md border border-dashed text-white/50 transition hover:border-[#3BB6E9] hover:text-[#3BB6E9]"
                style={{ borderColor: "rgba(255,255,255,0.20)", background: "#121212" }}
                title="Add images"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />

            <div className="text-[11px] text-white/45">
              Click a thumb to preview · First image is used as the default
            </div>
          </div>

          {/* Description */}
          <div className="flex min-h-0 flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#3BB6E9" }} />
              <span>AI generated description</span>
            </div>

            {loading ? (
              <div
                className="flex flex-1 flex-col items-start justify-start gap-3 rounded-md border border-white/10 p-4"
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

        <DialogFooter className="shrink-0 border-t border-white/10 px-5 py-3">
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
