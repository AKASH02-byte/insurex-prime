import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePause,
  CloudCheck,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  Pin,
  Search,
  SearchX,
  Share,
  StickyNote,
  Table2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fieldNotesStore,
  formatLongDate,
  formatShortDate,
  formatTime,
  isDueSoon,
  notesToCsv,
  relativeDayLabel,
  type FieldNote,
} from "../field-notes-data";
import { avatarTone, initialsOfClient } from "./note-theme";
import type { NoteStatusFilter } from "./StickyBoard";

interface NotesTableProps {
  notes: FieldNote[];
  status: NoteStatusFilter;
  onStatusChange: (status: NoteStatusFilter) => void;
  dueSoonOnly: boolean;
  onDueSoonChange: (value: boolean) => void;
  onShowBoard: () => void;
  onEdit: (note: FieldNote) => void;
  onReschedule: (notes: FieldNote[]) => void;
}

const PAGE_SIZE = 10;

function StatusBadge({ note }: { note: FieldNote }) {
  if (note.status === "COMPLETED")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-fo-high px-2.5 py-1 text-[11px] font-bold text-fo-ink">
        <CircleCheck className="size-3.5 fill-fo-primary text-white" /> Completed
      </span>
    );
  if (note.status === "POSTPONED")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-fo-error-container px-2.5 py-1 text-[11px] font-bold text-fo-on-error-container">
        <CirclePause className="size-3.5" /> Postponed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-fo-tertiary-container px-2.5 py-1 text-[11px] font-bold text-white">
      <span className="relative flex size-1.5">
        {isDueSoon(note) && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-fo-tertiary-fixed" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-fo-tertiary-fixed" />
      </span>
      In Progress
    </span>
  );
}

function FollowUpCell({ note }: { note: FieldNote }) {
  if (!note.followUpAt) return <span className="text-sm text-fo-muted">—</span>;
  if (note.status === "COMPLETED")
    return (
      <span className="whitespace-nowrap text-sm font-medium tabular-nums text-fo-muted">
        {note.recurring
          ? `${note.recurring} (${new Date(note.followUpAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })})`
          : formatLongDate(note.followUpAt)}
      </span>
    );
  if (isDueSoon(note)) {
    const Icon = note.status === "POSTPONED" ? AlarmClock : TriangleAlert;
    return (
      <div className="inline-flex flex-col">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold tabular-nums text-fo-error">
          <Icon className="size-3.5" />
          {formatShortDate(note.followUpAt)} ({relativeDayLabel(note.followUpAt)})
        </span>
        <span className="whitespace-nowrap text-xs text-fo-muted">
          {formatTime(note.followUpAt)} • {note.followUpLabel}
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex flex-col">
      <span className="whitespace-nowrap text-sm font-medium tabular-nums text-fo-ink">
        {formatLongDate(note.followUpAt)}
      </span>
      <span className="whitespace-nowrap text-xs text-fo-muted">{note.followUpLabel}</span>
    </div>
  );
}

function MemoPill({ note }: { note: FieldNote }) {
  const [expanded, setExpanded] = useState(false);
  const open = note.status !== "COMPLETED";
  const TagIcon =
    note.status === "COMPLETED" ? BadgeCheck : note.status === "POSTPONED" ? CalendarClock : Pin;
  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      className={cn(
        "block w-full max-w-[260px] cursor-pointer rounded-lg p-2 text-left transition-shadow",
        open ? "bg-fo-tertiary-fixed/30" : "bg-fo-container",
        expanded && "shadow-md",
      )}
    >
      <p
        className={cn(
          "text-xs",
          open ? "font-medium text-fo-tertiary" : "text-fo-ink",
          !expanded && "line-clamp-2",
        )}
      >
        {note.note}
      </p>
      <span
        className={cn(
          "mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold",
          open ? "text-fo-tertiary" : "text-fo-muted",
        )}
      >
        <TagIcon className="size-3" /> {note.tag}
      </span>
    </button>
  );
}

export function NotesTable({
  notes,
  status,
  onStatusChange,
  dueSoonOnly,
  onDueSoonChange,
  onShowBoard,
  onEdit,
  onReschedule,
}: NotesTableProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const dueSoonCount = notes.filter(isDueSoon).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = notes.filter((note) => {
      if (status !== "all" && note.status !== status) return false;
      if (dueSoonOnly && !isDueSoon(note)) return false;
      if (!q) return true;
      return [note.clientName, note.contactName, note.coverage, note.note, note.tag]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    // Follow-up focus sorts by what's due first.
    return dueSoonOnly
      ? [...rows].sort((a, b) => (a.followUpAt ?? "").localeCompare(b.followUpAt ?? ""))
      : rows;
  }, [notes, query, status, dueSoonOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage(1), [query, status, dueSoonOnly]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Forget selections that are no longer visible.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(notes.map((note) => note.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [notes]);

  const allVisibleSelected = rows.length > 0 && rows.every((note) => selected.has(note.id));
  const toggleAll = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((note) => (checked ? next.add(note.id) : next.delete(note.id)));
      return next;
    });
  const toggleOne = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const selectedNotes = notes.filter((note) => selected.has(note.id));

  const markCompleted = () => {
    if (!selectedNotes.length) {
      toast.info("Select at least one record");
      return;
    }
    const previous = selectedNotes.map((note) => [note.id, note.status] as const);
    fieldNotesStore.updateMany(
      selectedNotes.map((note) => note.id),
      { status: "COMPLETED" },
    );
    setSelected(new Set());
    toast.success(`Updated ${previous.length} records to Completed`, {
      action: {
        label: "Undo",
        onClick: () =>
          previous.forEach(([id, prev]) => fieldNotesStore.update(id, { status: prev })),
      },
    });
  };

  const reschedule = () => {
    if (!selectedNotes.length) {
      toast.info("Select at least one record");
      return;
    }
    onReschedule(selectedNotes);
  };

  const exportCsv = () => {
    const source = selectedNotes.length ? selectedNotes : filtered;
    const blob = new Blob([notesToCsv(source)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `field-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${source.length} records to CSV`);
  };

  const resetFilters = () => {
    setQuery("");
    onStatusChange("all");
    onDueSoonChange(false);
  };

  const stickyCell = "sticky z-10 bg-inherit";
  const actionButton =
    "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-fo-container transition-all hover:bg-fo-high active:scale-95 sm:size-8";

  return (
    <div className="-mx-4 flex flex-col sm:mx-0 sm:overflow-hidden sm:rounded-xl sm:border sm:border-fo-outline/50 sm:bg-fo-lowest">
      {/* View switcher & action strip */}
      <div className="flex flex-col gap-3 bg-fo-low px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full bg-fo-container p-1 shadow-sm">
            <button
              type="button"
              onClick={onShowBoard}
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-fo-muted transition-all hover:text-fo-ink"
            >
              <StickyNote className="size-4" /> Sticky Board
            </button>
            <span className="flex items-center gap-1.5 rounded-full bg-fo-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              <Table2 className="size-4" /> Table View
            </span>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-fo-highest px-3 text-xs font-semibold text-fo-ink shadow-sm transition-all active:scale-95"
            title="Export table data"
          >
            <Share className="size-4 text-fo-primary" /> Export
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fo-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client name, notes, policy tags..."
              aria-label="Search field records"
              className="h-11 w-full rounded-full bg-fo-lowest pl-10 pr-8 text-sm text-fo-ink shadow-sm placeholder:text-fo-muted focus:outline-none focus:ring-2 focus:ring-fo-primary/40 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-fo-muted hover:text-fo-ink"
              >
                <X className="size-4.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as NoteStatusFilter)}
              aria-label="Filter by status"
              className="h-11 cursor-pointer appearance-none rounded-full bg-fo-lowest pl-3 pr-8 text-xs font-semibold text-fo-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-fo-primary/40"
            >
              <option value="all">All Status</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="POSTPONED">Postponed</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4.5 -translate-y-1/2 text-fo-muted" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-fo-container px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-fo-primary" />
            <span className="text-[11px] font-bold text-fo-muted">
              Showing <strong className="text-fo-ink">{filtered.length}</strong> field records
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDueSoonChange(!dueSoonOnly)}
            aria-pressed={dueSoonOnly}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors",
              dueSoonOnly
                ? "bg-fo-error text-white"
                : "bg-fo-error-container text-fo-on-error-container",
            )}
          >
            <AlarmClock className="size-3.5" />
            {dueSoonCount} follow-ups &lt; 48h
            {dueSoonOnly && <X className="size-3" />}
          </button>
        </div>
      </div>

      {/* Ledger context */}
      <div className="flex items-center justify-between gap-2 bg-fo-surface px-4 py-2 sm:bg-fo-lowest">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fo-primary-fixed text-fo-on-primary-fixed">
            <NotebookPen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-fo-muted">Sticky Notes Ledger</p>
            <p className="text-xs font-semibold text-fo-ink">
              Auto-Synced from Voice Memos &amp; Field Pins
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-fo-primary lg:hidden">
          Scroll horizontally <ArrowRight className="size-4" />
        </span>
      </div>

      {/* Horizontally scrollable table with frozen checkbox + client columns */}
      {rows.length > 0 ? (
        <div className="relative w-full overflow-x-auto shadow-inner">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-fo-high text-fo-muted">
                <th
                  scope="col"
                  className={cn(
                    stickyCell,
                    "left-0 z-20 w-12 py-3 pl-4 pr-3 shadow-[2px_0_4px_rgba(0,0,0,0.03)]",
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label="Select all visible records"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleAll(event.target.checked)}
                    className="size-4.5 cursor-pointer accent-fo-primary"
                  />
                </th>
                <th
                  scope="col"
                  className={cn(
                    stickyCell,
                    "left-12 z-20 min-w-[170px] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-fo-ink shadow-[4px_0_6px_rgba(0,0,0,0.04)]",
                  )}
                >
                  Client Name
                </th>
                <th
                  scope="col"
                  className="min-w-[110px] px-3 py-3 text-xs font-semibold uppercase tracking-wider"
                >
                  Logged Date
                </th>
                <th
                  scope="col"
                  className="min-w-[250px] px-3 py-3 text-xs font-semibold uppercase tracking-wider"
                >
                  Comments &amp; Field Memo
                </th>
                <th
                  scope="col"
                  className="min-w-[130px] px-3 py-3 text-xs font-semibold uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="min-w-[160px] px-3 py-3 text-xs font-semibold uppercase tracking-wider"
                >
                  Next Follow-Up
                </th>
                <th
                  scope="col"
                  className="min-w-[120px] py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider"
                >
                  Quick Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((note, index) => {
                const zebra = index % 2 === 0 ? "bg-fo-lowest" : "bg-fo-low";
                const whatsapp = note.phone.replace(/\D/g, "");
                return (
                  <tr
                    key={note.id}
                    className={cn(
                      "transition-colors hover:bg-fo-low",
                      zebra,
                      selected.has(note.id) && "bg-fo-low",
                    )}
                  >
                    <td
                      className={cn(
                        stickyCell,
                        "left-0 py-3 pl-4 pr-3 shadow-[2px_0_4px_rgba(0,0,0,0.03)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${note.clientName}`}
                        checked={selected.has(note.id)}
                        onChange={(event) => toggleOne(note.id, event.target.checked)}
                        className="size-4.5 cursor-pointer accent-fo-primary"
                      />
                    </td>
                    <td
                      className={cn(
                        stickyCell,
                        "left-12 px-3 py-3 shadow-[4px_0_6px_rgba(0,0,0,0.04)]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                            avatarTone(index),
                          )}
                        >
                          {initialsOfClient(note.clientName)}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[130px] truncate text-sm font-semibold text-fo-ink">
                            {note.clientName}
                          </p>
                          <p className="max-w-[130px] text-xs text-fo-muted">{note.coverage}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium tabular-nums text-fo-ink">
                      {formatLongDate(note.loggedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <MemoPill note={note} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge note={note} />
                    </td>
                    <td className="px-3 py-3">
                      <FollowUpCell note={note} />
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={note.phone ? `tel:${note.phone}` : undefined}
                          title="Call contact"
                          aria-label={`Call ${note.clientName}`}
                          className={cn(actionButton, "text-fo-primary")}
                        >
                          <Phone className="size-4" />
                        </a>
                        <a
                          href={whatsapp ? `https://wa.me/${whatsapp}` : undefined}
                          target="_blank"
                          rel="noreferrer"
                          title="SMS / WhatsApp"
                          aria-label={`Message ${note.clientName}`}
                          className={cn(actionButton, "text-fo-tertiary")}
                        >
                          <MessageCircle className="size-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onEdit(note)}
                          title="Edit memo"
                          aria-label={`Edit memo for ${note.clientName}`}
                          className={cn(actionButton, "text-fo-muted")}
                        >
                          <Pencil className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-3 grid size-16 place-items-center rounded-full bg-fo-container text-fo-muted">
            <SearchX className="size-8" />
          </span>
          <h3 className="mb-1 font-fo-display text-lg font-semibold text-fo-ink">
            No Client Records Found
          </h3>
          <p className="mb-4 max-w-xs text-sm text-fo-muted">
            No matching sticky notes or names align with your current search and filter settings.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 cursor-pointer rounded-full bg-fo-primary px-4 text-xs font-semibold text-white"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Batch actions */}
      <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-2xl bg-fo-inverse p-3 text-fo-inverse-on shadow-lg">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-fo-primary-fixed text-[11px] font-bold text-fo-on-primary-fixed">
            {selected.size}
          </span>
          <span className="text-xs font-semibold">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markCompleted}
            className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-white/15 px-3 text-[11px] font-bold transition-all hover:bg-white/25 active:scale-95"
          >
            <ListChecks className="size-4" /> Mark Completed
          </button>
          <button
            type="button"
            onClick={reschedule}
            className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-fo-tertiary px-3 text-[11px] font-bold text-white transition-all active:scale-95"
          >
            <CalendarClock className="size-4" /> Reschedule
          </button>
        </div>
      </div>

      {/* Pagination & sync status */}
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            aria-label="Previous page"
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-fo-container text-fo-muted disabled:cursor-default disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-xs font-semibold text-fo-ink">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            aria-label="Next page"
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-fo-container text-fo-muted disabled:cursor-default disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-fo-muted">
          <CloudCheck className="size-3.5 text-emerald-600" />
          <span>Ledger synced with offline cache just now</span>
        </div>
      </div>
    </div>
  );
}
