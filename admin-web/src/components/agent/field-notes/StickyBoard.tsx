import {
  Archive,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCheck,
  CircleCheck,
  CirclePause,
  ClipboardList,
  Clock,
  FilePenLine,
  MapPin,
  Mic,
  Phone,
  StickyNote,
  Table2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "../agent-ui";
import {
  formatLongDate,
  formatTime,
  noteStatusLabel,
  type FieldNote,
  type FieldNoteStatus,
} from "../field-notes-data";
import { archiveNote, completeNote } from "./note-actions";
import { categoryIcon, paletteFor, tapeTilt } from "./note-theme";

export type NoteStatusFilter = "all" | FieldNoteStatus;

interface StickyBoardProps {
  notes: FieldNote[];
  status: NoteStatusFilter;
  onStatusChange: (status: NoteStatusFilter) => void;
  onShowTable: () => void;
  onQuickMemo: () => void;
  onEdit: (note: FieldNote) => void;
  onReschedule: (note: FieldNote) => void;
  territory: string;
}

const DAY = 86_400_000;

export function StickyBoard({
  notes,
  status,
  onStatusChange,
  onShowTable,
  onQuickMemo,
  onEdit,
  onReschedule,
  territory,
}: StickyBoardProps) {
  const now = Date.now();
  const meetings = notes.filter(
    (note) =>
      note.status !== "COMPLETED" &&
      note.followUpAt &&
      new Date(note.followUpAt).getTime() - now < 7 * DAY,
  ).length;
  const counts = {
    all: notes.length,
    IN_PROGRESS: notes.filter((note) => note.status === "IN_PROGRESS").length,
    POSTPONED: notes.filter((note) => note.status === "POSTPONED").length,
    COMPLETED: notes.filter((note) => note.status === "COMPLETED").length,
  };
  const pending = counts.IN_PROGRESS + counts.POSTPONED;
  const visible = status === "all" ? notes : notes.filter((note) => note.status === status);

  const pills: [NoteStatusFilter, string][] = [
    ["all", "All"],
    ["IN_PROGRESS", "In Progress"],
    ["POSTPONED", "Postponed"],
    ["COMPLETED", "Completed"],
  ];

  return (
    <div className="flex flex-col gap-3 lg:gap-5">
      {/* Quick operational stats */}
      <div className="flex items-center justify-between rounded-full bg-fo-low px-4 py-2.5 shadow-sm lg:justify-start lg:gap-8">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-fo-ink sm:text-xs">
          <CalendarDays className="size-4.5 shrink-0 text-fo-primary" />
          <span className="truncate">
            <strong className="text-fo-primary">{meetings}</strong> Meetings
          </span>
        </span>
        <span className="size-1 rounded-full bg-fo-outline" />
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-fo-ink sm:text-xs">
          <ClipboardList className="size-4.5 shrink-0 text-fo-tertiary" />
          <span className="truncate">
            <strong className="text-fo-tertiary">{pending}</strong> Pending
          </span>
        </span>
        <span className="size-1 rounded-full bg-fo-outline" />
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-fo-ink sm:text-xs">
          <CircleCheck className="size-4.5 shrink-0 text-emerald-700" />
          <span className="truncate">
            <strong className="text-emerald-800">{counts.COMPLETED}</strong> Done
          </span>
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
        {/* Quick Memo Mode banner */}
        <div
          role="button"
          tabIndex={0}
          onClick={onQuickMemo}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onQuickMemo();
            }
          }}
          className="relative flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-xl bg-fo-primary p-3.5 text-white shadow-md transition-transform active:scale-[0.99] lg:p-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative grid size-10 shrink-0 place-items-center rounded-full bg-fo-primary-container shadow-sm lg:size-12">
              <Mic className="size-5.5 animate-pulse" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-fo-tertiary-fixed opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-fo-tertiary-fixed" />
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1">
                <Zap className="size-4 shrink-0 fill-fo-tertiary-fixed text-fo-tertiary-fixed" />
                <span className="truncate font-fo-display text-lg font-semibold tracking-tight">
                  Quick Memo Mode
                </span>
              </div>
              <span className="truncate text-xs text-[#cce5ff]">
                Tap to dictate or drop a memo between visits
              </span>
            </div>
          </div>
          <span className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-fo-primary shadow-sm">
            Record <ArrowRight className="size-4" />
          </span>
        </div>

        {/* Active territory */}
        <div className="hero-field relative flex h-28 items-end overflow-hidden rounded-xl bg-[#1e3a5f] p-3 shadow-sm lg:h-auto lg:min-h-28 lg:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(0,123,185,0.55),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(163,103,0,0.35),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30] via-[#0b1c30]/40 to-transparent" />
          <div className="relative z-10 flex w-full items-center justify-between gap-2 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fo-primary-container/80 backdrop-blur-sm">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#cce5ff]">
                  Active Territory
                </p>
                <p className="line-clamp-2 text-sm font-bold">{territory}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold backdrop-blur-md">
              {pending} Visits Nearby
            </span>
          </div>
        </div>
      </div>

      {/* Title, view toggle and filters */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate font-fo-display text-xl font-bold tracking-tight text-fo-ink lg:text-2xl">
              Active Memos
            </h2>
            <span className="hidden shrink-0 rounded-full bg-fo-high px-2 py-0.5 text-[11px] font-bold text-fo-muted min-[420px]:inline">
              {notes.length} total
            </span>
          </div>
          <div className="flex shrink-0 items-center rounded-full bg-fo-container p-1 shadow-inner">
            <span className="flex items-center gap-1 rounded-full bg-fo-lowest px-3 py-1 text-xs font-semibold text-fo-primary shadow-sm">
              <StickyNote className="size-4 fill-fo-primary/15" /> Sticky
            </span>
            <button
              type="button"
              onClick={onShowTable}
              className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-fo-muted transition-colors hover:text-fo-ink"
            >
              <Table2 className="size-4" /> Table
            </button>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1.5 pt-0.5 sm:mx-0 sm:px-0">
          {pills.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusChange(value)}
              aria-pressed={status === value}
              className={cn(
                "h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-xs font-semibold transition-all active:scale-95",
                status === value
                  ? "bg-fo-ink text-fo-surface shadow-sm"
                  : "bg-fo-container text-fo-muted hover:text-fo-ink",
              )}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>
      </div>

      {/* Sticky memos */}
      {visible.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No memos here"
          description="Nothing matches this filter yet. Drop a memo after your next visit."
          className="border-fo-outline bg-fo-low"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((note, index) => (
            <MemoCard
              key={note.id}
              note={note}
              index={index}
              onEdit={onEdit}
              onReschedule={onReschedule}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoCard({
  note,
  index,
  onEdit,
  onReschedule,
}: {
  note: FieldNote;
  index: number;
  onEdit: (note: FieldNote) => void;
  onReschedule: (note: FieldNote) => void;
}) {
  const palette = paletteFor(note, index);
  const Icon = categoryIcon[note.category];
  const completed = note.status === "COMPLETED";
  const postponed = note.status === "POSTPONED";
  const DueIcon = completed ? CalendarCheck : postponed ? CalendarClock : CalendarRange;
  const softButton = cn(
    "grid size-10 shrink-0 cursor-pointer place-items-center rounded-full shadow-sm transition-all hover:bg-white active:scale-90 sm:size-9",
    palette.softButton,
  );

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-xl p-4 transition-transform duration-200 hover:-translate-y-0.5",
        palette.card,
        palette.shadow,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2 rounded-[1px] bg-white/70 shadow-sm backdrop-blur-sm",
          tapeTilt[index % tapeTilt.length],
        )}
      />

      <div className="mb-2 flex items-start justify-between gap-2 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("size-4.5 shrink-0", palette.accent)} />
            <h3
              className={cn(
                "truncate font-fo-display text-lg font-semibold tracking-tight",
                palette.title,
              )}
            >
              {note.clientName}
            </h3>
          </div>
          {note.contactName && (
            <p className={cn("truncate text-xs font-medium", palette.sub)}>{note.contactName}</p>
          )}
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm",
            palette.badge,
          )}
        >
          {completed ? (
            <CheckCheck className="size-3.5" />
          ) : postponed ? (
            <CirclePause className="size-3.5" />
          ) : (
            <span
              className={cn("size-1.5 animate-pulse rounded-full bg-current", palette.accent)}
            />
          )}
          {noteStatusLabel[note.status]}
        </span>
      </div>

      <div className={cn("mb-2.5 flex items-center gap-1 text-[11px] font-bold", palette.sub)}>
        <Clock className="size-3.5" />
        <span className="tabular-nums">
          {formatLongDate(note.loggedAt)} • {formatTime(note.loggedAt)}
        </span>
      </div>

      <div className={cn("mb-3 flex-1 rounded-lg p-3 shadow-inner", palette.inner)}>
        <p className={cn("text-sm leading-relaxed", palette.title)}>{note.note}</p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
            palette.badge,
          )}
        >
          <DueIcon className={cn("size-4 shrink-0", palette.accent)} />
          <span className="truncate tabular-nums">
            {note.followUpAt
              ? completed
                ? `${formatLongDate(note.followUpAt)}${note.recurring ? ` (${note.recurring})` : ""}`
                : `Due: ${formatLongDate(note.followUpAt)}`
              : "No follow-up"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {note.phone ? (
            <a
              href={`tel:${note.phone}`}
              aria-label={`Call ${note.clientName}`}
              className={softButton}
            >
              <Phone className="size-4.5" />
            </a>
          ) : null}
          {completed ? (
            <button
              type="button"
              aria-label="Archive memo"
              onClick={() => archiveNote(note)}
              className={softButton}
            >
              <Archive className="size-4.5" />
            </button>
          ) : postponed ? (
            <button
              type="button"
              aria-label="Reschedule follow-up"
              onClick={() => onReschedule(note)}
              className={softButton}
            >
              <CalendarDays className="size-4.5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Edit memo"
              onClick={() => onEdit(note)}
              className={softButton}
            >
              <FilePenLine className="size-4.5" />
            </button>
          )}
          {!completed && (
            <button
              type="button"
              aria-label="Mark complete"
              onClick={() => completeNote(note)}
              className={cn(
                "grid size-10 shrink-0 cursor-pointer place-items-center rounded-full shadow-sm transition-all active:scale-90 sm:size-9",
                palette.solidButton,
              )}
            >
              <Check className="size-4.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
