import { prisma } from "@/lib/prisma";

export async function resolveAssigneeId(businessId: string, formData: FormData) {
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (!assigneeId) return null;

  const member = await prisma.membership.findFirst({
    where: { businessId, userId: assigneeId },
  });
  return member ? assigneeId : null;
}
