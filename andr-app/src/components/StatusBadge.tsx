import type { OrderStatus } from "../types/models";
import { ORDER_STATUS_LABELS } from "../types/constants";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{ORDER_STATUS_LABELS[status]}</span>;
}
