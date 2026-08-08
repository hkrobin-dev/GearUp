import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";

async function seedDemoUsers() {
  const demoPassword = await bcrypt.hash(
    "Demo@123456",
    10,
  );

  const customer = await prisma.user.upsert({
    where: {
      email: "demo.customer@gearup.com",
    },

    update: {
      password: demoPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },

    create: {
      name: "Demo Customer",
      email: "demo.customer@gearup.com",
      password: demoPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      email: "demo.admin@gearup.com",
    },

    update: {
      password: demoPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },

    create: {
      name: "Demo Admin",
      email: "demo.admin@gearup.com",
      password: demoPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(
    "✅ Demo Customer:",
    customer.email,
  );

  console.log(
    "✅ Demo Admin:",
    admin.email,
  );
}

seedDemoUsers()
  .catch((error) => {
    console.error(
      "❌ Demo user seed failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });