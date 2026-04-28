import { NumericFormat } from 'react-number-format';

interface Props {
  value: number | string;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  decimalScale?: number;
}

export function NumberInput({
  value,
  onChange,
  className = "",
  placeholder,
  disabled,
  min,
  max,
  allowDecimals = true,
  decimalScale,
}: Props) {
  return (
    <NumericFormat
      value={value}
      onValueChange={(values) => {
        let val = values.floatValue ?? 0;
        onChange(val);
      }}
      thousandSeparator="."
      decimalSeparator=","
      allowedDecimalSeparators={[",", "."]}
      decimalScale={allowDecimals ? (decimalScale ?? 6) : 0}
      allowNegative={min === undefined || min < 0}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      isAllowed={(values) => {
        const { floatValue } = values;
        if (floatValue === undefined) return true;
        if (max !== undefined && floatValue > max) return false;
        return true;
      }}
    />
  );
}
