import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NativeSelect } from "../agent-ui";
import {
  fieldNotesStore,
  noteStatusLabel,
  type FieldNote,
  type FieldNoteCategory,
  type FieldNoteStatus,
} from "../field-notes-data";
import { categoryLabel } from "./note-theme";

export type NoteDialogMode = "add" | "edit" | "reschedule";

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: NoteDialogMode;
  /** The memo being edited or rescheduled (or several, for a batch reschedule). */
  notes?: FieldNote[] | undefined;
  /** Start dictating as soon as the dialog opens ("Quick Memo Mode"). */
  startDictation?: boolean | undefined;
}

/** datetime-local value (local time, minutes precision) ↔ ISO. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const defaultFollowUp = () => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
};

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as
    (new () => SpeechRecognitionLike) | null;
}

const fieldClass =
  "h-12 rounded-md border-[#cbd5e1] bg-white text-sm focus-visible:border-fo-primary focus-visible:ring-1 focus-visible:ring-fo-primary sm:h-10";

export function NoteFormDialog({
  open,
  onOpenChange,
  mode,
  notes = [],
  startDictation = false,
}: NoteFormDialogProps) {
  const editing = notes[0];
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [coverage, setCoverage] = useState("");
  const [category, setCategory] = useState<FieldNoteCategory>("health");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FieldNoteStatus>("IN_PROGRESS");
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpLabel, setFollowUpLabel] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientName(editing?.clientName ?? "");
    setContactName(editing?.contactName ?? "");
    setPhone(editing?.phone ?? "");
    setCoverage(editing?.coverage ?? "");
    setCategory(editing?.category ?? "health");
    setNote(editing?.note ?? "");
    setStatus(mode === "reschedule" ? "POSTPONED" : (editing?.status ?? "IN_PROGRESS"));
    setFollowUpAt(toLocalInput(editing?.followUpAt ?? defaultFollowUp()));
    setFollowUpLabel(editing?.followUpLabel ?? "Follow-up call");
    if (startDictation && mode === "add") startListening();
    return () => recognitionRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function startListening() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      toast.info("Voice dictation isn't supported in this browser. Type the memo instead.");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const text = results.map((result) => result[0]?.transcript ?? "").join(" ");
        setNote((prev) => `${prev ? `${prev.trimEnd()} ` : ""}${text.trim()}`);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        toast.error("Couldn't hear you — check microphone permission.");
      };
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      toast.error("Voice dictation couldn't start.");
    }
  }

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else startListening();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const followUp = fromLocalInput(followUpAt);

    if (mode === "reschedule") {
      if (!followUp) {
        toast.error("Pick a new follow-up date.");
        return;
      }
      fieldNotesStore.updateMany(
        notes.map((item) => item.id),
        { followUpAt: followUp, followUpLabel: followUpLabel.trim() || "Follow-up", status },
      );
      toast.success(
        notes.length > 1
          ? `Rescheduled follow-ups for ${notes.length} clients`
          : `Follow-up rescheduled for ${notes[0]?.clientName}`,
      );
      onOpenChange(false);
      return;
    }

    if (!clientName.trim() || !note.trim()) {
      toast.error("Client name and memo are required.");
      return;
    }
    const values = {
      clientName: clientName.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      coverage: coverage.trim() || categoryLabel[category],
      category,
      note: note.trim(),
      status,
      followUpAt: followUp,
      followUpLabel: followUpLabel.trim() || "Follow-up",
    };
    if (mode === "edit" && editing) {
      fieldNotesStore.update(editing.id, values);
      toast.success("Memo updated");
    } else {
      fieldNotesStore.add(values);
      toast.success("Memo pinned to your board");
    }
    onOpenChange(false);
  };

  const title =
    mode === "add" ? "New field memo" : mode === "edit" ? "Edit memo" : "Reschedule follow-up";
  const description =
    mode === "reschedule"
      ? notes.length > 1
        ? `Set a new follow-up for ${notes.length} selected clients.`
        : `Set a new follow-up for ${editing?.clientName ?? "this client"}.`
      : "Capture what happened on the visit and when to follow up.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto max-h-[92dvh] max-w-none translate-y-0 gap-0 overflow-y-auto rounded-t-2xl border-fo-outline/60 bg-fo-surface p-0 font-fo-body text-fo-ink data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-[50%] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-fo-outline/50 px-5 pb-4 pt-5 text-left">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-fo-outline sm:hidden" />
            <DialogTitle className="font-fo-display text-lg font-bold">{title}</DialogTitle>
            <DialogDescription className="text-xs text-fo-muted">{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-5 py-4">
            {mode !== "reschedule" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="note-client" className="text-xs font-semibold">
                      Client / business *
                    </Label>
                    <Input
                      id="note-client"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. ABC Logistics"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="note-contact" className="text-xs font-semibold">
                      Contact person
                    </Label>
                    <Input
                      id="note-contact"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Name (role)"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="note-phone" className="text-xs font-semibold">
                      Phone
                    </Label>
                    <Input
                      id="note-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="note-category" className="text-xs font-semibold">
                      Line
                    </Label>
                    <NativeSelect
                      id="note-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FieldNoteCategory)}
                      className={cn(fieldClass, "w-full rounded-md")}
                    >
                      {Object.entries(categoryLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="note-coverage" className="text-xs font-semibold">
                    Cover / policy ref
                  </Label>
                  <Input
                    id="note-coverage"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    placeholder="e.g. Family Floater #HL-2041"
                    className={fieldClass}
                  />
                </div>
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="note-body" className="text-xs font-semibold">
                      Memo *
                    </Label>
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={cn(
                        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-colors",
                        listening
                          ? "bg-fo-error text-white"
                          : "bg-fo-primary-fixed text-fo-on-primary-fixed hover:bg-fo-high",
                      )}
                    >
                      {listening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                      {listening ? "Stop" : "Dictate"}
                    </button>
                  </div>
                  <Textarea
                    id="note-body"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder={listening ? "Listening…" : "What did you discuss?"}
                    className="rounded-sm border-[#f59e0b] bg-[#fef9c3] text-sm leading-relaxed text-[#713f12] placeholder:text-[#a16207]/70 focus-visible:ring-1 focus-visible:ring-[#d97706]"
                  />
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="note-followup" className="text-xs font-semibold">
                  Next follow-up
                </Label>
                <Input
                  id="note-followup"
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-followup-label" className="text-xs font-semibold">
                  Follow-up type
                </Label>
                <Input
                  id="note-followup-label"
                  value={followUpLabel}
                  onChange={(e) => setFollowUpLabel(e.target.value)}
                  placeholder="Renewal call, onsite visit…"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-semibold">Status</span>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-fo-container p-1">
                {(Object.keys(noteStatusLabel) as FieldNoteStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    aria-pressed={status === value}
                    className={cn(
                      "h-9 cursor-pointer rounded-full text-xs font-semibold transition-all",
                      status === value
                        ? "bg-white text-fo-primary shadow-sm"
                        : "text-fo-muted hover:text-fo-ink",
                    )}
                  >
                    {noteStatusLabel[value]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-fo-outline/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-md border-[#cbd5e1] sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-md bg-fo-primary text-white hover:bg-[#004b73] sm:h-10"
            >
              {mode === "add" ? "Pin memo" : mode === "edit" ? "Save changes" : "Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
