import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAgentSession } from "@/components/agent/agent-session-context";
import {
  useFieldNotes,
  type FieldNote,
  type FieldNoteStatus,
} from "@/components/agent/field-notes-data";
import { NoteFormDialog, type NoteDialogMode } from "@/components/agent/field-notes/NoteFormDialog";
import { NotesTable } from "@/components/agent/field-notes/NotesTable";
import { StickyBoard, type NoteStatusFilter } from "@/components/agent/field-notes/StickyBoard";

interface NotesSearch {
  view?: "table" | undefined;
  status?: FieldNoteStatus | undefined;
  due?: "soon" | undefined;
}

const statuses: FieldNoteStatus[] = ["IN_PROGRESS", "COMPLETED", "POSTPONED"];

export const Route = createFileRoute("/agent/notes")({
  validateSearch: (raw: Record<string, unknown>): NotesSearch => ({
    view: raw["view"] === "table" ? "table" : undefined,
    status: statuses.includes(raw["status"] as FieldNoteStatus)
      ? (raw["status"] as FieldNoteStatus)
      : undefined,
    due: raw["due"] === "soon" ? "soon" : undefined,
  }),
  head: () => ({ meta: [{ title: "Field Notes — InsureX Prime" }] }),
  component: FieldNotesPage,
});

function FieldNotesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/agent/notes" });
  const { agent } = useAgentSession();
  const notes = useFieldNotes();

  const [dialog, setDialog] = useState<{
    mode: NoteDialogMode;
    notes: FieldNote[];
    dictate?: boolean;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = (value: NonNullable<typeof dialog>) => {
    setDialog(value);
    setDialogOpen(true);
  };

  const status: NoteStatusFilter = search.status ?? "all";
  const setSearch = (patch: Partial<NotesSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const setStatus = (value: NoteStatusFilter) =>
    setSearch({ status: value === "all" ? undefined : value });

  const territory =
    agent.address?.split(",").slice(0, 2).join(",").trim() || "Metro Business Corridor";

  return (
    <div className="font-fo-body text-fo-ink">
      {search.view === "table" ? (
        <NotesTable
          notes={notes}
          status={status}
          onStatusChange={setStatus}
          dueSoonOnly={search.due === "soon"}
          onDueSoonChange={(value) => setSearch({ due: value ? "soon" : undefined })}
          onShowBoard={() => setSearch({ view: undefined, due: undefined })}
          onEdit={(note) => openDialog({ mode: "edit", notes: [note] })}
          onReschedule={(selected) => openDialog({ mode: "reschedule", notes: selected })}
        />
      ) : (
        <StickyBoard
          notes={notes}
          status={status}
          onStatusChange={setStatus}
          onShowTable={() => setSearch({ view: "table" })}
          onQuickMemo={() => openDialog({ mode: "add", notes: [], dictate: true })}
          onEdit={(note) => openDialog({ mode: "edit", notes: [note] })}
          onReschedule={(note) => openDialog({ mode: "reschedule", notes: [note] })}
          territory={territory}
        />
      )}

      {/* Floating "+ Note" trigger, sitting above the mobile bottom nav */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 lg:bottom-8 lg:right-8">
        <button
          type="button"
          onClick={() => openDialog({ mode: "add", notes: [] })}
          className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-fo-primary px-4 text-sm font-semibold text-white shadow-lg shadow-fo-primary/20 transition-all hover:bg-fo-primary-container active:scale-95"
        >
          <Plus className="size-5" /> Note
        </button>
      </div>

      <NoteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialog?.mode ?? "add"}
        notes={dialog?.notes}
        startDictation={dialog?.dictate}
      />
    </div>
  );
}
