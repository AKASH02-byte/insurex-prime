import { toast } from "sonner";
import { fieldNotesStore, type FieldNote } from "../field-notes-data";

export function completeNote(note: FieldNote) {
  const previous = note.status;
  fieldNotesStore.update(note.id, { status: "COMPLETED" });
  toast.success(`${note.clientName} marked completed`, {
    description: "Queued for sync.",
    action: { label: "Undo", onClick: () => fieldNotesStore.update(note.id, { status: previous }) },
  });
}

export function archiveNote(note: FieldNote) {
  fieldNotesStore.remove(note.id);
  toast.success(`Memo for ${note.clientName} archived`, {
    action: { label: "Undo", onClick: () => fieldNotesStore.restore(note) },
  });
}
