import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const [, , email, action] = process.argv;

if (!email || !["on", "off"].includes(action)) {
  console.error("Usage: npm run admin -- <user-email> <on|off>");
  process.exit(1);
}

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

if (!user) {
  console.error(`No user found with email "${email}".`);
  process.exit(1);
}

const isSuperAdmin = action === "on";

await prisma.user.update({
  where: { id: user.id },
  data: { isSuperAdmin },
});

console.log(`${user.email}: platform admin is now ${isSuperAdmin ? "ON" : "OFF"}`);

await prisma.$disconnect();
