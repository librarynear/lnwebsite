export const metadata = {
  title: "Sanity Studio",
  description: "Sanity Studio",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      {children}
    </div>
  );
}
