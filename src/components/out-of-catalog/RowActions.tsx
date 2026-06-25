import type { OocRow } from "@/data/outOfCatalogTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

const BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

function AddNewBindIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12.0341 2.25C9.39106 2.25 7.14434 3.97782 6.36309 6.36309C3.97782 7.14434 2.25 9.39106 2.25 12.0341C2.25 15.3237 4.9263 18 8.2159 18C10.8589 18 13.1057 16.2722 13.8869 13.8869C16.2722 13.1057 18 10.8589 18 8.2159C18 4.9263 15.3237 2.25 12.0341 2.25ZM8.2159 16.5682C5.7158 16.5682 3.6818 14.5342 3.6818 12.0341C3.6818 10.3094 4.64981 8.80674 6.07094 8.04037C6.06928 8.09869 6.06818 8.1572 6.06818 8.2159C6.06818 11.5055 8.74448 14.1818 12.0341 14.1818C12.0928 14.1818 12.1513 14.1807 12.2096 14.179C11.4433 15.6002 9.94058 16.5682 8.2159 16.5682ZM14.1791 12.2096C14.1807 12.1513 14.1818 12.0928 14.1818 12.0341C14.1818 8.74451 11.5055 6.06821 8.21593 6.06821C8.15723 6.06821 8.09873 6.06931 8.0404 6.07097C8.80677 4.64984 10.3094 3.68184 12.0341 3.68184C14.5342 3.68184 16.5682 5.71583 16.5682 8.21593C16.5682 9.94058 15.6002 11.4433 14.1791 12.2096Z" fill="#FCD34D" />
      <path d="M11.2941 12.2857H9.71429V10.7059C9.71429 10.3177 9.38829 10 9 10C8.61171 10 8.28571 10.3177 8.28571 10.7059V12.2857H6.70586C6.31771 12.2857 6 12.6117 6 13C6 13.3883 6.31771 13.7143 6.70586 13.7143H8.28571V15.2941C8.28571 15.6823 8.61171 16 9 16C9.38829 16 9.71429 15.6823 9.71429 15.2941V13.7143H11.2941C11.6823 13.7143 12 13.3883 12 13C12 12.6117 11.6823 12.2857 11.2941 12.2857Z" fill="#FCD34D" />
    </svg>
  );
}

function BindToExistingIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M11.1818 0C8.16121 0 5.59353 1.97466 4.70067 4.70067C1.97466 5.59353 0 8.16121 0 11.1818C0 14.9414 3.05863 18 6.81817 18C9.83879 18 12.4065 16.0253 13.2993 13.2993C16.0253 12.4065 18 9.83879 18 6.81817C18 3.05863 14.9414 0 11.1818 0ZM6.81817 16.3637C3.96091 16.3637 1.63635 14.0391 1.63635 11.1818C1.63635 9.21076 2.74264 7.49341 4.36679 6.61757C4.36489 6.68422 4.36363 6.75109 4.36363 6.81817C4.36363 10.5777 7.42226 13.6363 11.1818 13.6363C11.2489 13.6363 11.3157 13.6351 11.3824 13.6332C10.5066 15.2574 8.78924 16.3637 6.81817 16.3637ZM13.6332 11.3824C13.6351 11.3158 13.6364 11.2489 13.6364 11.1818C13.6364 7.42229 10.5777 4.36366 6.8182 4.36366C6.75112 4.36366 6.68426 4.36493 6.6176 4.36683C7.49345 2.74268 9.2108 1.63638 11.1819 1.63638C14.0391 1.63638 16.3637 3.96095 16.3637 6.8182C16.3637 8.78924 15.2574 10.5066 13.6332 11.3824Z" fill="#3BB6E9" />
    </svg>
  );
}

function MarkUnrecognizedIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.1875 6.1377C14.8389 5.21191 14.2002 4.42383 13.3447 3.86426C12.4893 3.29883 11.4668 3 10.3975 3H10.3858C9.07032 3.02051 7.87794 3.5127 6.94044 4.41797C6.02345 5.30566 5.53712 6.4043 5.4961 7.68164C5.47267 8.44336 6.00587 9.04395 6.73829 9.0791C6.76173 9.0791 6.78517 9.08203 6.8086 9.08203C7.53224 9.08203 8.0713 8.56055 8.12403 7.81055L8.12696 7.78418C8.13282 7.64355 8.1504 7.50293 8.1797 7.3623C8.41407 6.38086 9.1963 5.75391 10.3272 5.63965C10.4004 5.63379 10.4736 5.62793 10.5469 5.62793C11.4375 5.62793 12.3076 6.16406 12.665 6.93457C13.0606 7.79004 12.8731 8.53125 12.1231 9.0791C11.9649 9.19336 11.7979 9.2959 11.6221 9.40137C11.5195 9.46289 11.4141 9.52734 11.3086 9.59473C11.2061 9.66211 11.1006 9.72656 10.9922 9.79395C10.7168 9.9668 10.4297 10.1426 10.166 10.3506C9.48634 10.8867 9.15528 11.5518 9.18165 12.3311C9.20802 12.9727 9.69142 13.5 10.3301 13.582C10.3828 13.5879 10.4356 13.5908 10.4912 13.5908C11.1123 13.5908 11.6455 13.1777 11.7539 12.6064C11.7861 12.4336 11.8682 12.334 12.0908 12.1963C12.2402 12.1025 12.3926 12.0117 12.5449 11.9209C12.8643 11.7305 13.1953 11.5342 13.5088 11.3174C15.3164 10.0781 15.9463 8.1416 15.1875 6.1377Z" fill="#A878EC" />
      <path d="M10.4942 14.6289H10.4796C9.545 14.6436 8.79793 15.4082 8.80672 16.3398C8.81844 17.2393 9.59187 18.001 10.4913 18.001H10.503C11.4141 17.9951 12.1817 17.2217 12.1788 16.3164C12.1759 15.3848 11.42 14.6289 10.4942 14.6289Z" fill="#A878EC" />
      <path d="M5.29414 2.28571H3.71429V0.705857C3.71429 0.317714 3.38829 0 3 0C2.61171 0 2.28571 0.317714 2.28571 0.705857V2.28571H0.705857C0.317714 2.28571 0 2.61171 0 3C0 3.38829 0.317714 3.71429 0.705857 3.71429H2.28571V5.29414C2.28571 5.68229 2.61171 6 3 6C3.38829 6 3.71429 5.68229 3.71429 5.29414V3.71429H5.29414C5.68229 3.71429 6 3.38829 6 3C6 2.61171 5.68229 2.28571 5.29414 2.28571Z" fill="#A878EC" />
    </svg>
  );
}

export function RowActions({ row }: { row: OocRow }) {
  const isUnrecognized = row.status === "Unrecognized";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => toast.success(`Added new & bound: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <AddNewBindIcon className="h-4 w-4" />
        Add New &amp; Bind
      </button>
      <button
        type="button"
        onClick={() => toast.success(`Bind to existing: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <BindToExistingIcon className="h-4 w-4" />
        Bind to Existing
      </button>
      <button
        type="button"
        disabled={isUnrecognized}
        onClick={() => toast(`Marked as Unrecognized: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <MarkUnrecognizedIcon className="h-4 w-4" />
        Mark as Unrecognized
      </button>
      <button
        type="button"
        aria-label="More"
        className="flex h-8 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-row-hover hover:text-foreground"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
