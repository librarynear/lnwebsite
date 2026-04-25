interface MapEmbedProps {
  lat: number;
  lng: number;
  name: string;
}

export function MapEmbed({ lat, lng, name }: MapEmbedProps) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`;

  return (
    <iframe
      src={src}
      title={`Map showing location of ${name}`}
      className="h-52 w-full rounded-t-none border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
