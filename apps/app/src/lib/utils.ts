import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function range(start: number, end: number, step = 1) {
  const output: number[] = [];

  for (let i = start; i <= end; i += step) {
    output.push(i);
  }

  return output;
}