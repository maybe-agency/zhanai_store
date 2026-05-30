export function formatKgs(amount: number): string {
  const roundedAmount = Math.round(amount);
  const absoluteAmount = Math.abs(roundedAmount);
  const lastTwoDigits = absoluteAmount % 100;
  const lastDigit = absoluteAmount % 10;

  let currencyWord = "сомов";

  if (lastTwoDigits < 11 || lastTwoDigits > 14) {
    if (lastDigit === 1) {
      currencyWord = "сом";
    } else if (lastDigit >= 2 && lastDigit <= 4) {
      currencyWord = "сома";
    }
  }

  const formattedAmount = roundedAmount
    .toLocaleString("ru-RU")
    .replace(/\u00a0/g, " ");

  return `${formattedAmount} ${currencyWord}`;
}
