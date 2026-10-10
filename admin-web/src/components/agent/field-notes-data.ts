import { useSyncExternalStore } from "react";

/**
 * Field notes ("sticky memos") an agent drops between customer visits.
 *
 * UI-only for now: the data below is demo data held in memory. When the backend is
 * ready, replace `useFieldNotes` / `fieldNotesStore` with React Query calls against the
 * notes API — the `FieldNote` shape is what the screens expect.
 */
export type FieldNoteStatus = "IN_PROGRESS" | "COMPLETED" | "POSTPONED";

export type FieldNoteCategory =
  "fleet" | "health" | "family" | "motor" | "business" | "senior" | "travel" | "retail";

export interface FieldNote {
  id: string;
  /** Client or business name. */
  clientName: string;
  /** Person met, with role. */
  contactName: string;
  phone: string;
  /** Cover being discussed, e.g. "Fleet Motor #MT-904". */
  coverage: string;
  category: FieldNoteCategory;
  /** ISO timestamp the memo was logged. */
  loggedAt: string;
  note: string;
  /** Short tag shown under the memo, e.g. "Sticky Note #104". */
  tag: string;
  status: FieldNoteStatus;
  /** ISO timestamp of the next follow-up (null when nothing is scheduled). */
  followUpAt: string | null;
  /** What the follow-up is, e.g. "Renewal call". */
  followUpLabel: string;
  /** Set for recurring/annual follow-ups ("Annual review"). */
  recurring?: string;
}

export const noteStatusLabel: Record<FieldNoteStatus, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  POSTPONED: "Postponed",
};

// ─── Demo data (dates relative to today so "due in 2 days" always reads right) ─
const at = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const seedNotes = (): FieldNote[] => [
  {
    id: "n-104",
    clientName: "ABC Logistics",
    contactName: "Marcus D'Souza (Fleet Mgr)",
    phone: "+919812345601",
    coverage: "Fleet Motor #MT-904",
    category: "fleet",
    loggedAt: at(0, 10, 15),
    note: "Discussed fleet commercial motor renewal (14 trucks). Client concerned about deductible increase. Needs updated quote with ₹25k deductible option before board review.",
    tag: "Sticky Note #104",
    status: "IN_PROGRESS",
    followUpAt: at(2, 10),
    followUpLabel: "Renewal call",
  },
  {
    id: "n-103",
    clientName: "Apex Dental Care",
    contactName: "Dr. Ananya Rao",
    phone: "+919812345602",
    coverage: "Group Health & Cyber",
    category: "health",
    loggedAt: at(0, 8, 30),
    note: "Signed group health endorsement for 12 staff. Policy certificate delivered in person. Payment receipt issued via field terminal.",
    tag: "Binder Delivered",
    status: "COMPLETED",
    followUpAt: at(36, 11),
    followUpLabel: "Annual review",
    recurring: "Annual",
  },
  {
    id: "n-102",
    clientName: "Harbor Bistro",
    contactName: "Elena Fernandes (Owner)",
    phone: "+919812345603",
    coverage: "Shop & Liability",
    category: "business",
    loggedAt: at(-1, 16, 45),
    note: "Owner was in the middle of a lunch rush and health inspection. Rescheduled policy discussion on updated public liability and fire cover.",
    tag: "Rescheduled In Field",
    status: "POSTPONED",
    followUpAt: at(3, 15, 30),
    followUpLabel: "Onsite visit",
  },
  {
    id: "n-101",
    clientName: "Skyline Construction",
    contactName: "Dave Menon (Site Supt.)",
    phone: "+919812345604",
    coverage: "Workers Health & Motor",
    category: "motor",
    loggedAt: at(-1, 13, 20),
    note: "Worker safety audit review. Needs health cards for 35 subcontractors and motor cover for 3 site vehicles before permit sign-off next Tuesday.",
    tag: "Sticky Note #101",
    status: "IN_PROGRESS",
    followUpAt: at(1, 9),
    followUpLabel: "CFO desk",
  },
  {
    id: "n-100",
    clientName: "Green Valley Farms",
    contactName: "Ramesh Patil",
    phone: "+919812345605",
    coverage: "Tractor Motor & Family Health",
    category: "family",
    loggedAt: at(-2, 12),
    note: "Hail damage claim settlement (₹4,25,000) handed over in person. Client signed release receipt, very satisfied with turnaround.",
    tag: "Claim Closed",
    status: "COMPLETED",
    followUpAt: at(22, 10),
    followUpLabel: "Family floater upsell",
  },
  {
    id: "n-099",
    clientName: "Beacon Tech Hub",
    contactName: "Priya Nair (HR Head)",
    phone: "+919812345606",
    coverage: "Group Health + Key Person",
    category: "health",
    loggedAt: at(-2, 15, 10),
    note: "Series B round closed; updating group health sum insured for 80 employees. Awaiting medical underwriting packets for two co-founders.",
    tag: "Sticky Note #108",
    status: "IN_PROGRESS",
    followUpAt: at(4, 14),
    followUpLabel: "Underwriting check",
  },
  {
    id: "n-098",
    clientName: "Horizon Cold Storage",
    contactName: "Vikram Shah (Facility Mgr)",
    phone: "+919812345607",
    coverage: "Fleet Motor #RF-22",
    category: "fleet",
    loggedAt: at(-3, 11, 40),
    note: "Facility manager on medical leave. Postponed inspection of the refrigerated van fleet until the end of the month.",
    tag: "Inspection Pending",
    status: "POSTPONED",
    followUpAt: at(6, 11),
    followUpLabel: "Fleet inspection",
  },
  {
    id: "n-097",
    clientName: "Sterling Jewellers",
    contactName: "Meera Kapoor",
    phone: "+919812345608",
    coverage: "Senior Citizen Health",
    category: "senior",
    loggedAt: at(-4, 17),
    note: "Parents' senior citizen health plan issued. Premium paid in full via UPI. Shared hospital network list on WhatsApp.",
    tag: "Active In Force",
    status: "COMPLETED",
    followUpAt: at(36, 12),
    followUpLabel: "Annual review",
    recurring: "Annual",
  },
];

// ─── Tiny in-memory store shared by the board and table views ────────────────
type Listener = () => void;
let notes: FieldNote[] | null = null;
const listeners = new Set<Listener>();
const ensure = () => (notes ??= seedNotes());
const emit = () => listeners.forEach((listener) => listener());

export const fieldNotesStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => ensure(),
  add(input: Omit<FieldNote, "id" | "loggedAt" | "tag">) {
    const next = ensure().length + 105;
    const note: FieldNote = {
      ...input,
      id: `n-${Date.now()}`,
      loggedAt: new Date().toISOString(),
      tag: `Sticky Note #${next}`,
    };
    notes = [note, ...ensure()];
    emit();
    return note;
  },
  update(id: string, patch: Partial<FieldNote>) {
    notes = ensure().map((note) => (note.id === id ? { ...note, ...patch } : note));
    emit();
  },
  updateMany(ids: string[], patch: Partial<FieldNote>) {
    const set = new Set(ids);
    notes = ensure().map((note) => (set.has(note.id) ? { ...note, ...patch } : note));
    emit();
  },
  remove(id: string) {
    notes = ensure().filter((note) => note.id !== id);
    emit();
  },
  /** Puts a removed memo back (undo). */
  restore(note: FieldNote) {
    if (ensure().some((item) => item.id === note.id)) return;
    notes = [note, ...ensure()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    emit();
  },
};

const serverSnapshot = seedNotes();

export function useFieldNotes() {
  return useSyncExternalStore(
    fieldNotesStore.subscribe,
    fieldNotesStore.getSnapshot,
    () => serverSnapshot,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY = 86_400_000;

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Whole calendar days from today until the follow-up (negative when overdue). */
export const daysUntilFollowUp = (iso: string) =>
  Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);

/** Open (not completed) follow-ups due within the next 48 hours, including overdue ones. */
export const isDueSoon = (note: FieldNote) =>
  note.status !== "COMPLETED" &&
  note.followUpAt !== null &&
  new Date(note.followUpAt).getTime() - Date.now() < 2 * DAY;

export function relativeDayLabel(iso: string) {
  const days = daysUntilFollowUp(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days overdue`;
  return `In ${days} days`;
}

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const formatLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function notesToCsv(rows: FieldNote[]) {
  const header = [
    "Client",
    "Contact",
    "Phone",
    "Coverage",
    "Logged",
    "Status",
    "Next follow-up",
    "Follow-up",
    "Memo",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((note) =>
    [
      note.clientName,
      note.contactName,
      note.phone,
      note.coverage,
      formatLongDate(note.loggedAt),
      noteStatusLabel[note.status],
      note.followUpAt ? `${formatLongDate(note.followUpAt)} ${formatTime(note.followUpAt)}` : "",
      note.followUpLabel,
      note.note,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}
