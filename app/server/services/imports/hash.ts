import { createHash } from "crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, child) => {
    if (!child || typeof child !== "object" || Array.isArray(child)) return child;
    return Object.keys(child)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (child as Record<string, unknown>)[key];
        return acc;
      }, {});
  });
}
