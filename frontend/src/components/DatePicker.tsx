import { format, parseISO, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "lucide-react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, disabled, className = "", placeholder = "dd/mm/yyyy" }: Props) {
  // Chuyển chuỗi yyyy-mm-dd thành Date object, nếu không hợp lệ thì trả về null
  const selectedDate = value ? parseISO(value) : null;
  const isValidDate = selectedDate && isValid(selectedDate);

  return (
    <div className={`relative flex items-center ${className}`}>
      <ReactDatePicker
        selected={isValidDate ? selectedDate : null}
        onChange={(date: Date | null) => {
          if (date) {
            onChange(format(date, "yyyy-MM-dd"));
          } else {
            onChange("");
          }
        }}
        dateFormat="dd/MM/yyyy"
        locale={vi}
        disabled={disabled}
        placeholderText={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        wrapperClassName="w-full"
      />
      <Calendar size={16} className="absolute right-3 text-gray-400 pointer-events-none" />
    </div>
  );
}
