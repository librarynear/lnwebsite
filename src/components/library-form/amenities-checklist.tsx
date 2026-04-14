const AMENITY_OPTIONS = [
  "AC",
  "Wi-Fi",
  "RO Water",
  "Washroom",
  "Power Backup",
  "CCTV",
  "Locker",
  "Parking",
  "Tea/Coffee",
  "Security Guard",
  "Charging Points",
  "Silent Zone",
];

export function AmenitiesChecklist({
  initialSelected = [],
}: {
  initialSelected?: string[];
}) {
  const selected = new Set(initialSelected);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {AMENITY_OPTIONS.map((amenity) => (
          <label key={amenity} className="cursor-pointer">
            <input
              type="checkbox"
              name="amenities"
              value={amenity}
              defaultChecked={selected.has(amenity)}
              className="peer sr-only"
            />
            <span className="flex items-center rounded-xl border border-border/80 bg-slate-50/60 px-3 py-2 text-sm transition-colors peer-checked:border-primary/50 peer-checked:bg-primary/8 peer-checked:text-primary">
              {amenity}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Tap to select amenities. No Ctrl or Cmd key needed.
      </p>
    </div>
  );
}
