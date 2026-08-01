import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { MachinesView } from "./MachinesView";

export default async function MachinesPage() {
  const lang = await getLang();
  
  const machines = await prisma.machine.findMany({
    orderBy: { name: "asc" },
  });

  const initialMachines = await Promise.all(
    machines.map(async (m) => {
      const lastLog = await prisma.machineLog.findFirst({
        where: { machineId: m.id },
        orderBy: { timestamp: "desc" },
      });
      return {
        ...m,
        capacityPerHr: m.capacityPerHr ? Number(m.capacityPerHr) : null,
        lastLog: lastLog
          ? {
              temperature: lastLog.temperature ? Number(lastLog.temperature) : null,
              vibration: lastLog.vibration ? Number(lastLog.vibration) : null,
              powerKw: lastLog.powerKw ? Number(lastLog.powerKw) : null,
              rpm: lastLog.rpm ?? null,
              throughput: lastLog.throughput ? Number(lastLog.throughput) : null,
            }
          : null,
      };
    })
  );

  return (
    <div>
      <PageHeader
        title={t(lang, "mach.title")}
        subtitle={t(lang, "mach.subtitle")}
      />

      <MachinesView initialMachines={initialMachines} />
    </div>
  );
}
