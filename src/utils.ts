import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
};

export const PRIZE_LADDER = [
  1000, 2000, 3000, 5000, 7500, 
  15000, 30000, 60000, 125000, 250000,
  500000, 1000000, 2000000, 5000000, 10000000
];

export const SAFE_ZONES = [5, 10]; // 5th and 10th questions are safe zones
