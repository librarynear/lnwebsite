import prisma from "@/lib/prisma";
import { QueriesClient } from "./QueriesClient";

export default async function QueriesPage() {
  const queries = await prisma.query.findMany({
    include: {
      student: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <QueriesClient queries={queries} />
    </div>
  );
}
