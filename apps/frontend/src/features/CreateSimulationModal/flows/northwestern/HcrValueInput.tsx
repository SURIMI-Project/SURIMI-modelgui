import { useState } from "react";
import Input from "../../../../components/ui/Input/Input";

// Keep the typed text intact (including a trailing decimal point) while the
// form stores numeric API values. Curve dragging/reset still updates the text.
type Props = {
  label: string;
  name: string;
  value: number;
  scale: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  error?: string;
  isReadOnly?: boolean;
};
export default function HcrValueInput({ value, scale, onChange, error, ...props }: Props) {
  const format = (number: number) => Number.isFinite(number) ? String(number / scale) : "";
  const [draft, setDraft] = useState(() => ({ value, text: format(value) }));
  if (!Object.is(value, draft.value)) setDraft({ value, text: format(value) });
  return <Input {...props} type="text" inputMode="decimal" value={draft.text} placeholder="Enter a value"
    isRequired isInvalid={Boolean(error)} errorMessage={error} onChange={text => {
      const next = text.trim() === "" ? NaN : Number(text) * scale;
      setDraft({ value: next, text });
      onChange(next);
    }} />;
}
