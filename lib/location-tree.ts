interface LocationRow {
  id: string;
  name: string;
  parentLocationId: string | null;
  type: string | null;
  sortOrder: number | null;
}

export interface LocationOption {
  id: string;
  name: string;
  type: string | null;
  depth: number;
  hasChildren: boolean;
}

export function buildLocationOptions(locations: LocationRow[]): LocationOption[] {
  const childrenMap = new Map<string | null, LocationRow[]>();
  for (const loc of locations) {
    const key = loc.parentLocationId ?? null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(loc);
  }

  const result: LocationOption[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    children.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
    );
    for (const loc of children) {
      const hasChildren = childrenMap.has(loc.id) && childrenMap.get(loc.id)!.length > 0;
      result.push({ id: loc.id, name: loc.name, type: loc.type, depth, hasChildren });
      walk(loc.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}
