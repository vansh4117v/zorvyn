const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/db");

let adminToken, analystToken, viewerToken;
let adminRefreshToken, analystRefreshToken;
let adminId, analystId, viewerId;
let categoryId, secondCategoryId, emptyCategoryId;
let recordId, secondRecordId;

async function cleanDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Health Check", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Auth - Register", () => {
  it("registers an admin user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Admin User",
      email: "admin@test.com",
      password: "Password123",
      role: "ADMIN",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe("ADMIN");
    adminId = res.body.data.id;
  });

  it("registers an analyst user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Analyst User",
      email: "analyst@test.com",
      password: "Password123",
      role: "ANALYST",
    });
    expect(res.status).toBe(201);
    analystId = res.body.data.id;
  });

  it("registers a viewer user (default role)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Viewer User",
      email: "viewer@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("VIEWER");
    viewerId = res.body.data.id;
  });

  it("rejects duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup",
      email: "admin@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(409);
  });

  it("rejects invalid input (missing name)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "bad@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(422);
  });

  it("rejects short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Short",
      email: "short@test.com",
      password: "abc",
    });
    expect(res.status).toBe(422);
  });

  it("does not expose passwordHash", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "NoHash",
      email: "nohash@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe("Auth - Login", () => {
  it("logs in admin and returns access + refresh tokens", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe("ADMIN");
    adminToken = res.body.data.accessToken;
    adminRefreshToken = res.body.data.refreshToken;
  });

  it("logs in analyst", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "analyst@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(200);
    analystToken = res.body.data.accessToken;
    analystRefreshToken = res.body.data.refreshToken;
  });

  it("logs in viewer", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "viewer@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(200);
    viewerToken = res.body.data.accessToken;
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(401);
  });
});

describe("Auth - Refresh Token", () => {
  it("refreshes access token with valid refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: adminRefreshToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    adminToken = res.body.data.accessToken;
    adminRefreshToken = res.body.data.refreshToken;
  });

  it("rejects reused (rotated) refresh token", async () => {
    const oldToken = analystRefreshToken;
    const res1 = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldToken,
    });
    expect(res1.status).toBe(200);
    analystToken = res1.body.data.accessToken;
    analystRefreshToken = res1.body.data.refreshToken;

    const res2 = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldToken,
    });
    expect(res2.status).toBe(401);
  });

  it("rejects invalid refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: "totally-invalid-token",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(422);
  });
});

describe("Auth - Logout", () => {
  it("logs out and revokes refresh token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "viewer@test.com",
      password: "Password123",
    });
    const rt = loginRes.body.data.refreshToken;
    viewerToken = loginRes.body.data.accessToken;

    const res = await request(app).post("/api/auth/logout").send({
      refreshToken: rt,
    });
    expect(res.status).toBe(200);

    const refreshRes = await request(app).post("/api/auth/refresh").send({
      refreshToken: rt,
    });
    expect(refreshRes.status).toBe(401);
  });
});

describe("Auth - Me", () => {
  it("returns profile with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("admin@test.com");
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("rejects request without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
  });
});

describe("Users CRUD", () => {
  it("admin can list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });

  it("viewer cannot list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it("analyst cannot list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });

  it("admin can get user by id", async () => {
    const res = await request(app)
      .get(`/api/users/${viewerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("viewer@test.com");
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("admin can update user", async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Viewer", role: "ANALYST" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Viewer");
    expect(res.body.data.role).toBe("ANALYST");
  });

  it("admin cannot delete themselves", async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent user", async () => {
    const res = await request(app)
      .get("/api/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("revert viewer role back", async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "VIEWER", name: "Viewer User" });
    expect(res.status).toBe(200);
  });
});

describe("Categories CRUD", () => {
  it("analyst can create category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ name: "Salary", description: "Monthly salary" });
    expect(res.status).toBe(201);
    categoryId = res.body.data.id;
  });

  it("admin can create category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Rent", description: "Monthly rent" });
    expect(res.status).toBe(201);
    secondCategoryId = res.body.data.id;
  });

  it("admin creates empty category (for delete test)", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "ToDelete" });
    expect(res.status).toBe(201);
    emptyCategoryId = res.body.data.id;
  });

  it("viewer cannot create category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Nope" });
    expect(res.status).toBe(403);
  });

  it("rejects duplicate category name", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Salary" });
    expect(res.status).toBe(409);
  });

  it("all roles can list categories", async () => {
    const res = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("can get category by id", async () => {
    const res = await request(app)
      .get(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Salary");
  });

  it("analyst can update category", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ description: "Updated salary desc" });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("Updated salary desc");
  });

  it("analyst cannot delete category", async () => {
    const res = await request(app)
      .delete(`/api/categories/${emptyCategoryId}`)
      .set("Authorization", `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });

  it("admin can delete category without records", async () => {
    const res = await request(app)
      .delete(`/api/categories/${emptyCategoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Financial Records CRUD", () => {
  it("admin creates an income record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: "INCOME",
        categoryId,
        date: "2025-03-15T00:00:00.000Z",
        notes: "March salary",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.category).toBeDefined();
    expect(res.body.data.createdBy).toBeDefined();
    recordId = res.body.data.id;
  });

  it("admin creates an expense record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 1200,
        type: "EXPENSE",
        categoryId: secondCategoryId,
        date: "2025-03-16T00:00:00.000Z",
        notes: "March rent",
      });
    expect(res.status).toBe(201);
    secondRecordId = res.body.data.id;
  });

  it("viewer cannot create record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        amount: 100,
        type: "INCOME",
        categoryId,
        date: "2025-03-15T00:00:00.000Z",
      });
    expect(res.status).toBe(403);
  });

  it("analyst cannot create record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({
        amount: 100,
        type: "INCOME",
        categoryId,
        date: "2025-03-15T00:00:00.000Z",
      });
    expect(res.status).toBe(403);
  });

  it("lists records with offset pagination", async () => {
    const res = await request(app)
      .get("/api/records?page=1&limit=10")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.total).toBeDefined();
    expect(res.body.data.pagination.nextCursor).toBeDefined();
  });

  it("lists records with cursor pagination", async () => {
    const first = await request(app)
      .get("/api/records?limit=1")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(first.status).toBe(200);
    const cursor = first.body.data.pagination.nextCursor;
    expect(cursor).toBeDefined();

    const second = await request(app)
      .get(`/api/records?cursor=${cursor}&limit=1`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(second.status).toBe(200);
    expect(second.body.data.pagination.hasNext).toBeDefined();
    expect(second.body.data.records[0].id).not.toBe(first.body.data.records[0].id);
  });

  it("filters records by type", async () => {
    const res = await request(app)
      .get("/api/records?type=INCOME")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.records.forEach((r) => {
      expect(r.type).toBe("INCOME");
    });
  });

  it("filters records by categoryId", async () => {
    const res = await request(app)
      .get(`/api/records?categoryId=${categoryId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.records.forEach((r) => {
      expect(r.categoryId).toBe(categoryId);
    });
  });

  it("gets record by id with category and createdBy", async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.category).toBeDefined();
    expect(res.body.data.createdBy).toBeDefined();
    expect(res.body.data.createdBy.passwordHash).toBeUndefined();
  });

  it("admin updates a record", async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ notes: "Updated notes", amount: 5500 });
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe("Updated notes");
  });

  it("admin soft-deletes a record", async () => {
    const res = await request(app)
      .delete(`/api/records/${secondRecordId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("soft-deleted record is not found", async () => {
    const res = await request(app)
      .get(`/api/records/${secondRecordId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(404);
  });

  it("cannot delete category with records", async () => {
    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it("rejects record with invalid categoryId", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 100,
        type: "INCOME",
        categoryId: "00000000-0000-0000-0000-000000000000",
        date: "2025-01-01T00:00:00.000Z",
      });
    expect(res.status).toBe(404);
  });
});

describe("Dashboard", () => {
  beforeAll(async () => {
    await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 3000,
        type: "INCOME",
        categoryId,
        date: "2025-02-10T00:00:00.000Z",
        notes: "Feb salary",
      });
    await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 800,
        type: "EXPENSE",
        categoryId: secondCategoryId,
        date: "2025-02-15T00:00:00.000Z",
        notes: "Feb rent",
      });
  });

  it("GET /dashboard/summary", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBeDefined();
    expect(res.body.data.totalExpenses).toBeDefined();
    expect(res.body.data.netBalance).toBeDefined();
    expect(res.body.data.totalRecords).toBeGreaterThan(0);
  });

  it("GET /dashboard/summary with date filter", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary?startDate=2025-03-01&endDate=2025-03-31")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalRecords).toBeGreaterThan(0);
  });

  it("GET /dashboard/summary with empty range", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary?startDate=2020-01-01&endDate=2020-12-31")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalRecords).toBe(0);
  });

  it("GET /dashboard/category-breakdown", async () => {
    const res = await request(app)
      .get("/api/dashboard/category-breakdown")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].categoryName).toBeDefined();
  });

  it("GET /dashboard/category-breakdown with type filter", async () => {
    const res = await request(app)
      .get("/api/dashboard/category-breakdown?type=EXPENSE")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => {
      expect(r.type).toBe("EXPENSE");
    });
  });

  it("GET /dashboard/monthly-trends returns 12 months", async () => {
    const res = await request(app)
      .get("/api/dashboard/monthly-trends?year=2025")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(12);
    expect(res.body.data[0].month).toBe(1);
    expect(res.body.data[11].month).toBe(12);
  });

  it("GET /dashboard/recent-activity respects limit", async () => {
    const res = await request(app)
      .get("/api/dashboard/recent-activity?limit=2")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it("GET /dashboard/income-vs-expense (monthly)", async () => {
    const res = await request(app)
      .get("/api/dashboard/income-vs-expense?granularity=monthly")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].period).toBeDefined();
    expect(res.body.data[0].income).toBeDefined();
    expect(res.body.data[0].expense).toBeDefined();
  });

  it("GET /dashboard/income-vs-expense (daily)", async () => {
    const res = await request(app)
      .get("/api/dashboard/income-vs-expense?granularity=daily")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /dashboard/income-vs-expense (weekly)", async () => {
    const res = await request(app)
      .get("/api/dashboard/income-vs-expense?granularity=weekly")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /dashboard/income-vs-expense with date range", async () => {
    const res = await request(app)
      .get("/api/dashboard/income-vs-expense?granularity=monthly&startDate=2025-01-01&endDate=2025-12-31")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /dashboard/top-categories", async () => {
    const res = await request(app)
      .get("/api/dashboard/top-categories")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].rank).toBe(1);
    expect(res.body.data[0].categoryName).toBeDefined();
    expect(res.body.data[0].total).toBeDefined();
    expect(res.body.data[0].count).toBeDefined();
  });

  it("GET /dashboard/top-categories with type + limit", async () => {
    const res = await request(app)
      .get("/api/dashboard/top-categories?type=INCOME&limit=1")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it("GET /dashboard/category-trends", async () => {
    const res = await request(app)
      .get("/api/dashboard/category-trends?year=2025")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].months.length).toBe(12);
  });

  it("GET /dashboard/category-trends with type filter", async () => {
    const res = await request(app)
      .get("/api/dashboard/category-trends?year=2025&type=EXPENSE")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /dashboard/daily-cashflow", async () => {
    const res = await request(app)
      .get("/api/dashboard/daily-cashflow")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].cumulativeBalance).toBeDefined();
  });

  it("GET /dashboard/daily-cashflow with date range", async () => {
    const res = await request(app)
      .get("/api/dashboard/daily-cashflow?startDate=2025-03-01&endDate=2025-03-31")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /dashboard/year-comparison", async () => {
    const res = await request(app)
      .get("/api/dashboard/year-comparison?year1=2024&year2=2025")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(12);
    expect(res.body.data[0]["2024"]).toBeDefined();
    expect(res.body.data[0]["2025"]).toBeDefined();
  });

  it("dashboard requires authentication", async () => {
    const endpoints = [
      "/api/dashboard/summary",
      "/api/dashboard/category-breakdown",
      "/api/dashboard/monthly-trends",
      "/api/dashboard/recent-activity",
      "/api/dashboard/income-vs-expense",
      "/api/dashboard/top-categories",
      "/api/dashboard/category-trends",
      "/api/dashboard/daily-cashflow",
      "/api/dashboard/year-comparison",
    ];
    for (const endpoint of endpoints) {
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(401);
    }
  });
});

describe("Inactive User", () => {
  let inactiveToken;
  let inactiveId;

  it("create and deactivate a user", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "Inactive User",
      email: "inactive@test.com",
      password: "Password123",
    });
    inactiveId = reg.body.data.id;

    const login = await request(app).post("/api/auth/login").send({
      email: "inactive@test.com",
      password: "Password123",
    });
    inactiveToken = login.body.data.accessToken;

    await request(app)
      .patch(`/api/users/${inactiveId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "INACTIVE" });
  });

  it("inactive user cannot access protected routes", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${inactiveToken}`);
    expect(res.status).toBe(403);
  });

  it("inactive user cannot login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "inactive@test.com",
      password: "Password123",
    });
    expect(res.status).toBe(403);
  });
});

describe("User Deletion", () => {
  let tempId;

  it("create a temp user for deletion", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Temp User",
      email: "temp@test.com",
      password: "Password123",
    });
    tempId = res.body.data.id;
  });

  it("admin can delete another user", async () => {
    const res = await request(app)
      .delete(`/api/users/${tempId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("deleted user returns 404", async () => {
    const res = await request(app)
      .get(`/api/users/${tempId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
