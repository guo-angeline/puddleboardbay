// Empty-state copy for the spot list and map overlay (item 7, defect C). Names
// what actually caused the empty result (search, structured filters, or both)
// so "Clear filters" never silently also wipes a typed search without saying so.

const MAX_QUERY_LEN = 40;

export interface EmptyStateCopy {
  title: string;
  clearLabel: string;
  clearKind: "search" | "filters" | "all";
}

export function emptyStateCopy(search: string, filtersActive: boolean): EmptyStateCopy {
  const q = search.trim();
  const qd = q.length > MAX_QUERY_LEN ? `${q.slice(0, MAX_QUERY_LEN)}…` : q;

  if (q !== "" && filtersActive) {
    return {
      title: `No spots match "${qd}" with these filters.`,
      clearLabel: "Clear search and filters",
      clearKind: "all",
    };
  }
  if (q !== "") {
    return {
      title: `No spots match "${qd}".`,
      clearLabel: "Clear search",
      clearKind: "search",
    };
  }
  return {
    title: "No spots match your filters.",
    clearLabel: "Clear filters",
    clearKind: "filters",
  };
}
