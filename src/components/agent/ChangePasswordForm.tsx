import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentAuthApi, type CurrentUser } from "@/lib/api";
import { agentKeys } from "@/lib/agent-queries";
import { errorText } from "./agent-ui";

/** Same policy as the API: 8–128 characters with a letter and a number. */
export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(password)) return "Include at least one letter.";
  if (!/\d/.test(password)) return "Include at least one number.";
  if (password.trim() !== password) return "Remove spaces at the start or end.";
  return undefined;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string | undefined;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={128}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 rounded-xl pr-11 ${error ? "border-destructive" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ChangePasswordForm({
  currentLabel = "Current password",
  submitLabel = "Change password",
  onChanged,
}: {
  currentLabel?: string;
  submitLabel?: string;
  onChanged?: (user: CurrentUser) => void;
}) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const mutation = useMutation({
    mutationFn: () => agentAuthApi.changePassword(current, next),
    onSuccess: (user) => {
      // The API rotated the session cookie; refresh what we know about the user.
      queryClient.setQueryData(agentKeys.me, user);
      void queryClient.invalidateQueries({ queryKey: agentKeys.profile });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Your password has been changed. Other devices were signed out.");
      onChanged?.(user);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: typeof errors = {};
    if (!current) problems.current = "Enter your current password.";
    const nextProblem = passwordProblem(next);
    if (nextProblem) problems.next = nextProblem;
    else if (next === current) problems.next = "Choose a password different from the current one.";
    if (confirm !== next) problems.confirm = "The passwords don't match.";
    setErrors(problems);
    if (Object.keys(problems).length === 0) mutation.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PasswordInput
        id="pw-current"
        label={currentLabel}
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        error={errors.current}
      />
      <PasswordInput
        id="pw-new"
        label="New password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        error={errors.next}
      />
      <PasswordInput
        id="pw-confirm"
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={errors.confirm}
      />
      <p className="text-[11px] text-muted-foreground">
        At least 8 characters, including a letter and a number.
      </p>
      {mutation.error != null && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <ShieldAlert className="size-3.5 shrink-0" />
          {errorText(mutation.error, "Your password could not be changed.")}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="h-11 w-full rounded-xl">
        {mutation.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        {mutation.isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
