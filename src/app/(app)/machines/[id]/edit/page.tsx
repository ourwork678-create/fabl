import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { EditMachineForm } from "./EditMachineForm";

export default async function EditMachinePage({ params }: { params: { id: string } }) {
  await requireUser();

  const machine = await prisma.machine.findUnique({
    where: { id: params.id },
  });

  if (!machine) {
    notFound();
  }

  // Convert decimal fields to simple numbers/null to avoid hydration mismatch
  const serializedMachine = {
    ...machine,
    capacityPerHr: machine.capacityPerHr ? Number(machine.capacityPerHr) : null,
  };

  return <EditMachineForm machine={serializedMachine} />;
}
