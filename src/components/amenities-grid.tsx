import { AirVent, Wifi, Droplet, Bath, BatteryCharging, Video, Lock, Car, Coffee, ShieldCheck, CheckCircle2 } from "lucide-react";

export function AmenitiesGrid({ amenities }: { amenities: string[] }) {
  if (!amenities || amenities.length === 0) return null;

  // Simple fuzzy matching function to map an amenity string to a Lucide icon
  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("ac") || n.includes("air condition")) return <AirVent className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("wi-fi") || n.includes("wifi") || n.includes("internet")) return <Wifi className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("water") || n.includes("ro ")) return <Droplet className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("washroom") || n.includes("toilet") || n.includes("bathroom")) return <Bath className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("power") || n.includes("backup")) return <BatteryCharging className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("video") || n.includes("cctv") || n.includes("camera")) return <Video className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("locker") || n.includes("safe")) return <Lock className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("park") || n.includes("parking")) return <Car className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("coffee") || n.includes("tea") || n.includes("cafe")) return <Coffee className="w-5 h-5 text-muted-foreground/80" />;
    if (n.includes("guard") || n.includes("security")) return <ShieldCheck className="w-5 h-5 text-muted-foreground/80" />;
    return <CheckCircle2 className="w-5 h-5 text-muted-foreground/80" />; // Fallback icon
  };

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">What this place offers</h2>
      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
        {amenities.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center p-2 rounded-[0.4rem] bg-muted/60 border border-border/40">
              {getAmenityIcon(item)}
            </div>
            <span className="text-[15px] font-medium text-black/90 tracking-tight">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
