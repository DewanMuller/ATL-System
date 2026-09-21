import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Always re-checked against the database rather than trusted from the JWT,
// so revoking admin access takes effect on the very next request instead of
// waiting for the admin's session to expire.
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/dashboard");

  return { userId: user.id };
}
