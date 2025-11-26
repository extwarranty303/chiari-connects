import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * @fileoverview A collection of general-purpose utility functions for the application.
 */

/**
 * A utility function that merges Tailwind CSS classes with clsx for conditional class names.
 * It's essential for building dynamic and reusable components with varied styles.
 *
 * Example Usage:
 * cn('p-4', isSelected && 'bg-blue-500', 'text-white')
 *
 * @param {...ClassValue[]} inputs - A list of class names, conditional class objects, or arrays of classes.
 * @returns {string} The merged, optimized, and de-duplicated class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
