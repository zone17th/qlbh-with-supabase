const MONEY_SCALE = 2;
const QTY_SCALE = 6;

function pow10(scale: number): bigint {
  return 10n ** BigInt(scale);
}

function divRoundHalfUp(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) throw new Error("Division by zero");
  const sign = value < 0n ? -1n : 1n;
  const absolute = value < 0n ? -value : value;
  const quotient = absolute / divisor;
  const remainder = absolute % divisor;
  return sign * (remainder * 2n >= divisor ? quotient + 1n : quotient);
}

export function toScaled(value: unknown, scale: number): bigint {
  if (value === null || value === undefined || value === "") return 0n;
  const raw = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid decimal: ${raw}`);
  }
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, fractionPart = ""] = unsigned.split(".");
  const base = pow10(scale);
  const integer = BigInt(intPart || "0") * base;
  const padded = (fractionPart + "0".repeat(scale + 1)).slice(0, scale + 1);
  const kept = BigInt(padded.slice(0, scale) || "0");
  const roundDigit = Number(padded[scale] ?? "0");
  const scaled = integer + kept + (roundDigit >= 5 ? 1n : 0n);
  return negative ? -scaled : scaled;
}

export function money(value: unknown): bigint {
  return toScaled(value, MONEY_SCALE);
}

export function qty(value: unknown): bigint {
  return toScaled(value, QTY_SCALE);
}

export function toDbMoney(value: bigint): string {
  return toDecimalString(value, MONEY_SCALE);
}

export function toDbQty(value: bigint): string {
  return toDecimalString(value, QTY_SCALE);
}

export function toNumberMoney(value: bigint): number {
  return Number(toDbMoney(value));
}

export function toNumberQty(value: bigint): number {
  return Number(toDbQty(value));
}

export function toDecimalString(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = pow10(scale);
  const integer = absolute / base;
  const fraction = (absolute % base).toString().padStart(scale, "0");
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

export function moneyTimesQtyToMoney(
  moneyValue: bigint,
  quantityValue: bigint,
): bigint {
  return divRoundHalfUp(moneyValue * quantityValue, pow10(QTY_SCALE));
}

export function averageMoney(totalMoney: bigint, totalQty: bigint): bigint {
  if (totalQty <= 0n) return 0n;
  return divRoundHalfUp(totalMoney * pow10(QTY_SCALE), totalQty);
}

export function nvlMoney(value: unknown): bigint {
  return value === null || value === undefined ? 0n : money(value);
}

export function nvlQty(value: unknown): bigint {
  return value === null || value === undefined ? 0n : qty(value);
}
