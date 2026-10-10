import {
  CarFront,
  HeartPulse,
  House,
  Plane,
  ShoppingBag,
  Stethoscope,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { FieldNote, FieldNoteCategory } from "../field-notes-data";

export const categoryLabel: Record<FieldNoteCategory, string> = {
  health: "Health",
  family: "Family Floater",
  senior: "Senior Citizen",
  motor: "Motor",
  fleet: "Fleet Motor",
  business: "Business / Shop",
  travel: "Travel",
  retail: "Retail",
};

export const categoryIcon: Record<FieldNoteCategory, LucideIcon> = {
  health: Stethoscope,
  family: House,
  senior: HeartPulse,
  motor: CarFront,
  fleet: Truck,
  business: Store,
  travel: Plane,
  retail: ShoppingBag,
};

/** Paper colours for the sticky board, matching the Field Ops design. */
export interface StickyPalette {
  card: string;
  shadow: string;
  title: string;
  sub: string;
  accent: string;
  badge: string;
  inner: string;
  softButton: string;
  solidButton: string;
}

const palettes = {
  yellow: {
    card: "bg-[#fef9c3] text-[#713f12]",
    shadow: "shadow-[0_8px_16px_-4px_rgba(113,63,18,0.15),0_2px_4px_rgba(0,0,0,0.06)]",
    title: "text-[#713f12]",
    sub: "text-[#854d0e]",
    accent: "text-[#ca8a04]",
    badge: "bg-[#fef08a] text-[#854d0e]",
    inner: "bg-[#fefce8]/70",
    softButton: "bg-[#fefce8] text-[#854d0e]",
    solidButton: "bg-[#854d0e] text-[#fef9c3] hover:bg-[#713f12]",
  },
  sky: {
    card: "bg-[#e0f2fe] text-[#0369a1]",
    shadow: "shadow-[0_8px_16px_-4px_rgba(3,105,161,0.15),0_2px_4px_rgba(0,0,0,0.06)]",
    title: "text-[#0369a1]",
    sub: "text-[#0284c7]",
    accent: "text-[#0284c7]",
    badge: "bg-[#bae6fd] text-[#0369a1]",
    inner: "bg-[#f0f9ff]/70",
    softButton: "bg-[#f0f9ff] text-[#0284c7]",
    solidButton: "bg-[#0369a1] text-[#e0f2fe] hover:bg-[#075985]",
  },
  green: {
    card: "bg-[#dcfce7] text-[#14532d]",
    shadow: "shadow-[0_8px_16px_-4px_rgba(20,83,45,0.15),0_2px_4px_rgba(0,0,0,0.06)]",
    title: "text-[#14532d]",
    sub: "text-[#166534]",
    accent: "text-[#16a34a]",
    badge: "bg-[#bbf7d0] text-[#14532d]",
    inner: "bg-[#f0fdf4]/70",
    softButton: "bg-[#f0fdf4] text-[#166534]",
    solidButton: "bg-[#166534] text-[#dcfce7] hover:bg-[#14532d]",
  },
  rose: {
    card: "bg-[#ffe4e6] text-[#881337]",
    shadow: "shadow-[0_8px_16px_-4px_rgba(136,19,55,0.15),0_2px_4px_rgba(0,0,0,0.06)]",
    title: "text-[#881337]",
    sub: "text-[#9f1239]",
    accent: "text-[#e11d48]",
    badge: "bg-[#fecdd3] text-[#881337]",
    inner: "bg-[#fff1f2]/70",
    softButton: "bg-[#fff1f2] text-[#9f1239]",
    solidButton: "bg-[#881337] text-[#ffe4e6] hover:bg-[#4c0519]",
  },
} satisfies Record<string, StickyPalette>;

/** Completed → mint, postponed → rose, in-progress alternates warm yellow / sky blue. */
export function paletteFor(note: FieldNote, index: number): StickyPalette {
  if (note.status === "COMPLETED") return palettes.green;
  if (note.status === "POSTPONED") return palettes.rose;
  return index % 2 === 0 ? palettes.yellow : palettes.sky;
}

/** Slight tilt on the masking-tape strip so the board feels hand-pinned. */
export const tapeTilt = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2"];

const avatarTones = [
  "bg-fo-primary-fixed text-fo-on-primary-fixed",
  "bg-fo-secondary-container text-fo-on-secondary-container",
  "bg-fo-tertiary-fixed text-fo-on-tertiary-fixed",
  "bg-fo-primary-container text-white",
  "bg-fo-high text-fo-ink",
  "bg-fo-dim text-fo-ink",
];
export const avatarTone = (index: number) => avatarTones[index % avatarTones.length]!;

export const initialsOfClient = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
