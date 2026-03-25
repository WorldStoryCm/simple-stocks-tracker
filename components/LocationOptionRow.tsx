import { MapPin, Building2, DoorOpen, Layers, Package, Truck, Map } from "lucide-react";
import type { LocationOption } from "@/lib/location-tree";
import { capitalize } from "@/lib/string";

const TYPE_ICONS: Record<string, typeof MapPin> = {
  zone: Map,
  building: Building2,
  room: DoorOpen,
  shelf: Layers,
  container: Package,
  vehicle: Truck,
};

export function LocationOptionRow({ opt }: { opt: LocationOption }) {
  const Icon = (opt.type && TYPE_ICONS[opt.type]) || MapPin;
  return (
    <span
      className="inline-flex items-center gap-2"
      style={{ paddingLeft: `${opt.depth * 20}px` }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={opt.depth === 0 ? "font-medium" : ""}>{capitalize(opt.name)}</span>
    </span>
  );
}
