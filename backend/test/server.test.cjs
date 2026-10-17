"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const WebSocket = require("ws");
const { createApplication, validateArticle, validateEnquiry } = require("../server.cjs");
const { hashPassword, hashSessionToken, validateCredentials, verifyPassword } = require("../auth.cjs");

const validBooking = {
  enquiryType: "consultation",
  name: "Asha Sharma",
  mobile: "+91 98765 43210",
  preferredLanguage: "Hindi",
  consultationType: "Kundli Analysis",
  preferredDate: "2030-05-18",
  preferredTime: "14:30",
  message: "I would like to discuss my questions.",
  privacyConsent: true
};

test("valid consultation and contact enquiries pass validation", () => {
  assert.equal(validateEnquiry(validBooking), null);
  assert.equal(validateEnquiry({
    enquiryType: "contact",
    name: "Asha Sharma",
    mobile: "9876543210",
    preferredLanguage: "English",
    message: "Please contact me.",
    privacyConsent: true
  }), null);
});

test("enquiry validation rejects missing consent, invalid mobile and invalid consultation fields", () => {
  assert.match(validateEnquiry({ ...validBooking, privacyConsent: false }), /consent/i);
  assert.match(validateEnquiry({ ...validBooking, mobile: "call me" }), /mobile/i);
  assert.match(validateEnquiry({ ...validBooking, preferredTime: "25:90" }), /time/i);
  assert.match(validateEnquiry({ ...validBooking, preferredDate: "2030-02-30" }), /date/i);
});

test("customer credentials require an email and a long password", () => {
  assert.equal(validateCredentials({ email: "person@example.com", password: "twelve-chars!" }), null);
  assert.match(validateCredentials({ email: "bad-email", password: "twelve-chars!" }), /email/i);
  assert.match(validateCredentials({ email: "person@example.com", password: "short" }), /password/i);
});

test("password hashes verify without storing the original password", async () => {
  const password = "A secure password 123!";
  const passwordHash = await hashPassword(password);
  assert.notEqual(passwordHash, password);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword("wrong password", passwordHash), false);
});

test("article validation accepts bilingual text and rejects unsafe slugs", () => {
  const article = {
    slug: "kundli-basics",
    title_en: "Understanding a Kundli",
    title_hi: "कुंडली को समझना",
    excerpt_en: "An introduction.",
    excerpt_hi: "एक परिचय।",
    content_en: "Original article text.",
    content_hi: "मौलिक लेख।",
    published: false
  };
  assert.equal(validateArticle(article), null);
  assert.match(validateArticle({ ...article, slug: "../admin" }), /slug/i);
});

test("enquiry API validates requests and uses parameterized database writes", async (context) => {
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("FROM public.login_sessions")) return { rows: [] };
      return { rows: [], rowCount: 1 };
    }
  };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;

  const invalidResponse = await fetch(origin + "/api/enquiries", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ ...validBooking, privacyConsent: false })
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(queries.length, 0);

  const validResponse = await fetch(origin + "/api/enquiries", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(validBooking)
  });
  assert.equal(validResponse.status, 201);
  const insert = queries.find((query) => query.sql.includes("INSERT INTO public.consultation_enquiries"));
  assert.ok(insert);
  assert.match(insert.sql, /\$1/);
  assert.ok(insert.values.includes("Asha Sharma"));
});

test("static server does not expose secrets or database schema", async (context) => {
  const pool = { async query() { return { rows: [] }; } };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const file of ["/.env", "/database/schema.sql", "/backend/server.cjs", "/backend/auth.cjs", "/package.json"]) {
    const response = await fetch(origin + file);
    assert.equal(response.status, 404, file);
  }
  const page = await fetch(origin + "/login.html");
  assert.equal(page.status, 200);
});

test("sign-up creates only a customer account and stores a hashed session token", async (context) => {
  const statements = [];
  const client = {
    async query(sql, values) {
      statements.push({ sql, values });
      if (sql.includes("INSERT INTO public.astro_users")) {
        return { rows: [{ id: 8, first_name: "Asha", last_name: "Sharma", email: "asha@example.com", role: "customer" }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  const pool = { async connect() { return client; } };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  const response = await fetch(origin + "/api/signup", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Asha", lastName: "Sharma", email: "Asha@example.com", password: "A secure password 123!" })
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { user: { id: "8", firstName: "Asha", lastName: "Sharma", email: "asha@example.com", role: "customer" } });
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  const passwordInsert = statements.find((statement) => statement.sql.includes("INSERT INTO public.astro_users"));
  assert.match(passwordInsert.values[3], /^scrypt\$/);
  const sessionInsert = statements.find((statement) => statement.sql.includes("INSERT INTO public.login_sessions"));
  assert.match(sessionInsert.values[0], /^[a-f0-9]{64}$/);
});

test("customer enquiry history is scoped to its signed-in account", async (context) => {
  const token = crypto.randomBytes(32).toString("hex");
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("FROM public.login_sessions")) {
        assert.equal(values[0], hashSessionToken(token));
        return { rows: [{ id: 23, email: "asha@example.com", role: "customer" }] };
      }
      if (sql.includes("FROM public.consultation_enquiries")) {
        return { rows: [{ id: 4, name: "Asha Sharma" }] };
      }
      return { rows: [] };
    }
  };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/enquiries", {
    headers: { Cookie: "astro_session=" + token }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { enquiries: [{ id: 4, name: "Asha Sharma" }] });
  const customerQuery = queries.find((query) => query.sql.includes("FROM public.consultation_enquiries"));
  assert.deepEqual(customerQuery.values, [23]);
});

test("public visitors cannot access the astrologer article manager", async (context) => {
  const pool = { async query() { return { rows: [] }; } };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  const response = await fetch(origin + "/api/admin/articles");
  assert.equal(response.status, 403);
});

test("signed-in customer and admin exchange persisted real-time chat messages", async (context) => {
  const customerToken = crypto.randomBytes(32).toString("hex");
  const adminToken = crypto.randomBytes(32).toString("hex");
  const customerId = "23";
  const adminId = "1";
  const insertedMessages = [];
  const sessions = new Map([
    [hashSessionToken(customerToken), { id: customerId, email: "asha@example.com", role: "customer" }],
    [hashSessionToken(adminToken), { id: adminId, email: "admin@example.com", role: "admin" }]
  ]);
  const pool = {
    async query(sql, values) {
      if (sql.includes("FROM public.login_sessions")) {
        return { rows: [sessions.get(values[0])].filter(Boolean), rowCount: sessions.has(values[0]) ? 1 : 0 };
      }
      if (sql.includes("FROM public.astro_chat_consents")) return { rows: [{ accepted: 1 }], rowCount: 1 };
      if (sql.includes("FROM public.astro_users u") && sql.includes("u.role = 'customer'")) {
        return { rows: [{ id: customerId }], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO public.astro_chat_messages")) {
        const message = {
          id: String(insertedMessages.length + 1),
          customer_id: String(values[0]),
          sender_id: String(values[1]),
          message: values[2],
          created_at: new Date().toISOString()
        };
        insertedMessages.push(message);
        return { rows: [message], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
  };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const clients = [];
  context.after(async () => {
    clients.forEach((client) => client.terminate());
    await new Promise((resolve) => server.close(resolve));
  });
  const url = "ws://127.0.0.1:" + server.address().port + "/ws/chat";
  async function connect(token) {
    const client = new WebSocket(url, {
      headers: { Cookie: "astro_session=" + token, Origin: url.replace(/^ws:/, "http:").replace(/\/ws\/chat$/, "") }
    });
    clients.push(client);
    await new Promise((resolve, reject) => {
      client.once("open", resolve);
      client.once("error", reject);
    });
    return client;
  }
  async function nextMessage(client) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for a chat message.")), 2000);
      client.once("message", (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
    });
  }
  const customer = await connect(customerToken);
  const admin = await connect(adminToken);
  const customerReceived = nextMessage(customer);
  const adminReceived = nextMessage(admin);
  customer.send(JSON.stringify({ type: "message", message: "Hello from the customer." }));
  const [customerEvent, adminEvent] = await Promise.all([customerReceived, adminReceived]);
  assert.equal(customerEvent.message.message, "Hello from the customer.");
  assert.equal(adminEvent.message.customer_id, customerId);
  const replyReceived = nextMessage(customer);
  admin.send(JSON.stringify({ type: "message", customerId, message: "Hello from Astro Alok." }));
  assert.equal((await replyReceived).message.message, "Hello from Astro Alok.");
  assert.deepEqual(insertedMessages.map((message) => message.sender_id), [customerId, adminId]);
});

test("feedback is published only with explicit consent and never reveals account email publicly", async (context) => {
  const token = crypto.randomBytes(32).toString("hex");
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("FROM public.login_sessions")) {
        return { rows: [{ id: "7", email: "customer@example.com", role: "customer" }], rowCount: 1 };
      }
      if (sql.includes("FROM public.astro_customer_feedback") && sql.includes("WHERE is_public = TRUE")) {
        return { rows: [{ id: "3", rating: 5, message: "A thoughtful conversation.", created_at: new Date().toISOString() }], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO public.astro_customer_feedback")) {
        return { rows: [{ rating: values[1], message: values[2], public_consent: true }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
  };
  const server = createApplication(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  const publicResponse = await fetch(origin + "/api/feedback");
  const publicResult = await publicResponse.json();
  assert.equal(publicResult.feedback[0].rating, 5);
  assert.equal(Object.hasOwn(publicResult.feedback[0], "email"), false);

  const rejected = await fetch(origin + "/api/feedback/mine", {
    method: "POST",
    headers: { Origin: origin, Cookie: "astro_session=" + token, "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 5, message: "A thoughtful conversation.", publicConsent: false })
  });
  assert.equal(rejected.status, 400);
  const accepted = await fetch(origin + "/api/feedback/mine", {
    method: "POST",
    headers: { Origin: origin, Cookie: "astro_session=" + token, "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 5, message: "A thoughtful conversation.", publicConsent: true })
  });
  assert.equal(accepted.status, 200);
  assert.equal(queries.find((query) => query.sql.includes("INSERT INTO public.astro_customer_feedback")).values[0], "7");
});
