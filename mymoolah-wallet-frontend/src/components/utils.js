// src/components/utils.js
export function formatRand(amount) {
  const parts = Number(Math.abs(amount))
    .toFixed(2)
    .toString()
    .split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R ${parts.join(".")}`;
}