const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const url = process.env.DATABASE_URL;
const adapter = new PrismaPg(url);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
