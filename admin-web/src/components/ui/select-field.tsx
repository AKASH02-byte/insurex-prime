import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix items cannot have an empty value, but our forms use "" for "none selected".
const EMPTY = "__empty__";

interface OptionData {
  value: string;
  label: React.ReactNode;
  disabled: boolean;
}

function collectOptions(children: React.ReactNode, out: OptionData[] = []): OptionData[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    if (child.type === "option") {
      const text = React.Children.toArray(props.children).join("");
      out.push({
        value: props.value !== undefined ? String(props.value) : text,
        label: props.children,
        disabled: Boolean(props.disabled),
      });
    } else if (props.children) {
      collectOptions(props.children, out); // fragments
    }
  });
  return out;
}

/**
 * Drop-in replacement for a native <select> that takes <option> children and an
 * onChange(e) handler reading e.target.value. The menu is rendered by Radix in a
 * portal, so it opens next to the field in every browser, including mobile emulation,
 * instead of the browser's own picker.
 */
export function SelectField({
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  name,
  className,
  children,
  "aria-label": ariaLabel,
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const options = collectOptions(children);
  const toRadix = (v: string) => (v === "" ? EMPTY : v);
  const controlled = value !== undefined;

  return (
    <Select
      {...(controlled
        ? { value: toRadix(String(value)) }
        : defaultValue !== undefined
          ? { defaultValue: toRadix(String(defaultValue)) }
          : {})}
      {...(name !== undefined ? { name } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      onValueChange={(next) => {
        const v = next === EMPTY ? "" : next;
        onChange?.({
          target: { value: v, name },
          currentTarget: { value: v, name },
        } as unknown as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={toRadix(o.value)} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
