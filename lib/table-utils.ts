import type { Row } from "@tanstack/react-table";

/**
 * Date sorting function that handles null/undefined values properly
 * Null values are sorted to the end
 */
export function createDateSortingFn<T>(
  accessor: (row: T) => string | Date | null | undefined,
) {
  return (rowA: Row<T>, rowB: Row<T>) => {
    const a = accessor(rowA.original);
    const b = accessor(rowB.original);

    // Handle null/undefined values - put them at the end
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    // Convert to Date objects for comparison
    const dateA = typeof a === "string" ? new Date(a) : a;
    const dateB = typeof b === "string" ? new Date(b) : b;

    return dateA.getTime() - dateB.getTime();
  };
}

/**
 * Format date for display, showing "Never" for null/undefined values
 */
export function formatDateCell(
  date: string | Date | null | undefined,
  fallbackText = "Never",
): string {
  if (!date) return fallbackText;
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString();
}

/**
 * Get user display name from user object
 */
export function getUserDisplayName(user: {
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email.split("@")[0];
}

/**
 * Get user full name or fallback to email username
 */
export function getUserFullName(
  user: {
    first_name?: string;
    last_name?: string;
    email?: string;
  },
  fallbackText = "No name provided",
): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return fallbackText;
}

/**
 * Truncate text and show full content in tooltip
 */
export function createTruncatedCell(
  text: string,
  maxWidth = "200px",
  tooltipContent?: React.ReactNode,
) {
  return {
    text,
    maxWidth,
    tooltipContent: tooltipContent || text,
  };
}

/**
 * Format user ID for display (last 8 characters)
 */
export function formatUserId(id: string): string {
  return id.slice(-8);
}
