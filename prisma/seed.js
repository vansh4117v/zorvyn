require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const categoryNames = [
    { name: "Salary", description: "Monthly salary income" },
    { name: "Rent", description: "Rent payments" },
    { name: "Groceries", description: "Grocery shopping expenses" },
    { name: "Freelance", description: "Freelance project income" },
    { name: "Utilities", description: "Utility bills (electricity, water, internet)" },
    { name: "Entertainment", description: "Entertainment and leisure spending" },
    { name: "Investment", description: "Investment income and returns" },
  ];

  const categories = {};
  for (const cat of categoryNames) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories[cat.name] = created;
    console.log(`  Category: ${created.name}`);
  }

  const passwordHash = await bcrypt.hash("Password@1234", 10);

  const usersData = [
    { name: "Admin User", email: "admin@finance.com", role: "ADMIN" },
    { name: "Analyst User", email: "analyst@finance.com", role: "ANALYST" },
    { name: "Viewer User", email: "viewer@finance.com", role: "VIEWER" },
  ];

  const users = {};
  for (const u of usersData) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    users[u.role] = created;
    console.log(`  User: ${created.email} (${created.role})`);
  }

  const now = new Date();
  function monthsAgo(n) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    d.setDate(Math.floor(Math.random() * 28) + 1);
    return d;
  }

  const records = [
    { amount: 5000, type: "INCOME", category: "Salary", date: monthsAgo(0), notes: "January salary" },
    { amount: 5000, type: "INCOME", category: "Salary", date: monthsAgo(1), notes: "December salary" },
    { amount: 5000, type: "INCOME", category: "Salary", date: monthsAgo(2), notes: "November salary" },
    { amount: 5000, type: "INCOME", category: "Salary", date: monthsAgo(3), notes: "October salary" },
    { amount: 1200, type: "EXPENSE", category: "Rent", date: monthsAgo(0), notes: "Monthly rent" },
    { amount: 1200, type: "EXPENSE", category: "Rent", date: monthsAgo(1), notes: "Monthly rent" },
    { amount: 1200, type: "EXPENSE", category: "Rent", date: monthsAgo(2), notes: "Monthly rent" },
    { amount: 350, type: "EXPENSE", category: "Groceries", date: monthsAgo(0), notes: "Weekly groceries" },
    { amount: 280, type: "EXPENSE", category: "Groceries", date: monthsAgo(1), notes: "Weekly groceries" },
    { amount: 420, type: "EXPENSE", category: "Groceries", date: monthsAgo(2), notes: "Monthly groceries" },
    { amount: 1500, type: "INCOME", category: "Freelance", date: monthsAgo(1), notes: "Web design project" },
    { amount: 2000, type: "INCOME", category: "Freelance", date: monthsAgo(3), notes: "Mobile app project" },
    { amount: 150, type: "EXPENSE", category: "Utilities", date: monthsAgo(0), notes: "Electricity bill" },
    { amount: 130, type: "EXPENSE", category: "Utilities", date: monthsAgo(1), notes: "Internet bill" },
    { amount: 160, type: "EXPENSE", category: "Utilities", date: monthsAgo(2), notes: "Water and electricity" },
    { amount: 80, type: "EXPENSE", category: "Entertainment", date: monthsAgo(0), notes: "Movie tickets" },
    { amount: 200, type: "EXPENSE", category: "Entertainment", date: monthsAgo(3), notes: "Concert tickets" },
    { amount: 500, type: "INCOME", category: "Investment", date: monthsAgo(4), notes: "Stock dividends" },
    { amount: 1000, type: "INCOME", category: "Investment", date: monthsAgo(5), notes: "Mutual fund returns" },
    { amount: 5000, type: "INCOME", category: "Salary", date: monthsAgo(4), notes: "September salary" },
    { amount: 1200, type: "EXPENSE", category: "Rent", date: monthsAgo(4), notes: "Monthly rent" },
    { amount: 300, type: "EXPENSE", category: "Groceries", date: monthsAgo(5), notes: "Grocery run" },
  ];

  const adminUser = users["ADMIN"];
  for (const rec of records) {
    await prisma.financialRecord.create({
      data: {
        amount: rec.amount,
        type: rec.type,
        categoryId: categories[rec.category].id,
        date: rec.date,
        notes: rec.notes,
        createdById: adminUser.id,
      },
    });
  }
  console.log(`  Created ${records.length} financial records`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
