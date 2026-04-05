import { Suspense } from "react";
import { PageContainer } from "@/components/PageContainer";
import {
  ProjectsListClient,
  type ProjectListRow,
} from "@/components/ProjectsListClient";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

function mapToRows(
  projects: Array<{
    id: string;
    name: string;
    status: string;
    customer: { name: string };
    quote:
      | {
          suggestedPrice: number;
          pendingRole: string | null;
          computed?: { grossMarginAtSuggest: number };
        }
      | null;
  }>,
): ProjectListRow[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    customerName: p.customer.name,
    status: p.status,
    suggestedPrice:
      p.quote && "suggestedPrice" in p.quote ? p.quote.suggestedPrice : null,
    grossMarginAtSuggest:
      p.quote && "computed" in p.quote && p.quote.computed
        ? p.quote.computed.grossMarginAtSuggest
        : null,
    pendingRole: p.quote?.pendingRole ?? null,
  }));
}

export default async function ProjectsPage() {
  const raw = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { customer: true, quote: true },
  });
  const projects = raw.map(enrichProject);
  const rows = mapToRows(projects);

  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="animate-pulse py-12 text-center text-sm text-zinc-500">
            加载列表…
          </div>
        }
      >
        <ProjectsListClient rows={rows} />
      </Suspense>
    </PageContainer>
  );
}
