import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const [, , identifier, action] = process.argv;

if (!identifier || !["on", "off"].includes(action)) {
  console.error("Usage: npm run entitlement -- <owner-email-or-join-code> <on|off>");
  process.exit(1);
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const business = await prisma.business.findFirst({
  where: {
    OR: [{ joinCode: identifier }, { owner: { email: identifier.toLowerCase() } }],
  },
});

if (!business) {
  console.error(`No business found for "${identifier}" (tried join code and owner email).`);
  process.exit(1);
}

const product = await prisma.product.upsert({
  where: { slug: "atl" },
  create: { slug: "atl", name: "Above The Line" },
  update: {},
});

const active = action === "on";

await prisma.entitlement.upsert({
  where: { businessId_productId: { businessId: business.id, productId: product.id } },
  create: { businessId: business.id, productId: product.id, active },
  update: { active, deactivatedAt: active ? null : new Date() },
});

console.log(`${business.name}: Above The Line is now ${active ? "ACTIVE" : "INACTIVE"}`);

await prisma.$disconnect();
