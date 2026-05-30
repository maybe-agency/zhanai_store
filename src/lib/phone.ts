const kyrgyzstanCode = "996";

function formatKyrgyzstanPhone(localDigits: string): string {
  const trimmedLocalDigits = localDigits.slice(0, 9);
  const groupedLocalDigits = [
    trimmedLocalDigits.slice(0, 3),
    trimmedLocalDigits.slice(3, 6),
    trimmedLocalDigits.slice(6, 9),
  ].filter(Boolean);

  return [`+${kyrgyzstanCode}`, ...groupedLocalDigits].join(" ");
}

export function formatPhoneInput(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const startsWithPlus = trimmedValue.startsWith("+");
  const digits = trimmedValue.replace(/\D/g, "");

  if (!digits) {
    return startsWithPlus ? "+" : "";
  }

  if (digits.startsWith(kyrgyzstanCode)) {
    return formatKyrgyzstanPhone(digits.slice(kyrgyzstanCode.length));
  }

  if (!startsWithPlus && digits.startsWith("0")) {
    return formatKyrgyzstanPhone(digits.slice(1));
  }

  if (!startsWithPlus && digits.length <= 9) {
    return formatKyrgyzstanPhone(digits);
  }

  return `+${digits}`;
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith(kyrgyzstanCode)) {
    return `+${digits.slice(0, 12)}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+996${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+996${digits}`;
  }

  return `+${digits}`;
}
