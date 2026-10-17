"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Pool } = require("pg");
const { WebSocketServer, WebSocket } = require("ws");
const { hashPassword, hashSessionToken, validateCredentials, verifyPassword } = require("./auth.cjs");

const ROOT = path.resolve(__dirname, "../frontend");
const MAX_BODY_BYTES = 128 * 1024;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const CHAT_RATE_WINDOW_MS = 60 * 1000;
const CHAT_RATE_MAX_MESSAGES = 30;
const SESSION_DAYS = 3650;
const SESSION_COOKIE = "astro_session";
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 10;
const rateLimits = new Map();
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function validateEnquiry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "The enquiry must be a JSON object.";
  }
  if (body.enquiryType !== "consultation" && body.enquiryType !== "contact") {
    return "Choose a valid enquiry type.";
  }
  if (body.privacyConsent !== true) {
    return "Privacy consent is required.";
  }
  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
    return "Enter a name of 1 to 100 characters.";
  }
  if (typeof body.mobile !== "string" || !/^\+?[0-9]{7,15}$/.test(body.mobile.trim().replace(/[\s()-]/g, ""))) {
    return "Enter a valid mobile number.";
  }
  if (body.preferredLanguage !== "Hindi" && body.preferredLanguage !== "English") {
    return "Choose Hindi or English.";
  }
  if (body.message !== undefined && body.message !== null
      && (typeof body.message !== "string" || body.message.length > 1000)) {
    return "The message must be 1000 characters or fewer.";
  }
  if (body.enquiryType === "contact") {
    return typeof body.message === "string" && body.message.trim()
      ? null
      : "A contact message is required.";
  }
  if (!["Kundli Analysis", "Vedic Astrology Consultation", "Spiritual Guidance", "Vastu Consultation"].includes(body.consultationType)) {
    return "Choose a valid consultation type.";
  }
  if (typeof body.preferredDate !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate)
      || Number.isNaN(Date.parse(body.preferredDate))
      || new Date(body.preferredDate).toISOString().slice(0, 10) !== body.preferredDate) {
    return "Enter a valid preferred date.";
  }
  if (typeof body.preferredTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.preferredTime)) {
    return "Enter a valid preferred time.";
  }
  return null;
}

function validatePoojaEnquiry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "The pooja request must be a JSON object.";
  if (body.privacyConsent !== true) return "Privacy consent is required.";
  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) return "Enter a name of 1 to 100 characters.";
  if (typeof body.mobile !== "string" || !/^\+?[0-9]{7,15}$/.test(body.mobile.trim().replace(/[\s()-]/g, ""))) return "Enter a valid mobile number.";
  if (typeof body.address !== "string" || !body.address.trim() || body.address.trim().length > 500) return "Enter an address of 1 to 500 characters.";
  if (body.preferredLanguage !== "Hindi" && body.preferredLanguage !== "English") return "Choose Hindi or English.";
  if (!["वास्तु पूजा", "कालसर्प पूजा", "महामृत्युंजय जप अनुष्ठान", "ग्रह शांति", "ग्रह दोष निवारण", "पितृदोष निवारण"].includes(body.poojaType)) return "Choose a valid pooja.";
  if (body.mode !== "Online" && body.mode !== "Offline") return "Choose online or offline pooja.";
  if (typeof body.preferredDate !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate)
      || Number.isNaN(Date.parse(body.preferredDate))
      || new Date(body.preferredDate).toISOString().slice(0, 10) !== body.preferredDate) return "Enter a valid preferred date.";
  if (typeof body.preferredTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.preferredTime)) return "Enter a valid preferred time.";
  return null;
}

function validateArticle(body) {
  const fields = ["slug", "title_en", "title_hi", "excerpt_en", "excerpt_hi", "content_en", "content_hi"];
  if (!body || typeof body !== "object" || Array.isArray(body)
      || fields.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
    return "Complete all article fields in both languages.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || body.slug.length > 100) {
    return "Use a URL-friendly article slug with lowercase letters, numbers and hyphens.";
  }
  if (body.title_en.length > 180 || body.title_hi.length > 180
      || body.excerpt_en.length > 500 || body.excerpt_hi.length > 500
      || body.content_en.length > 50000 || body.content_hi.length > 50000) {
    return "Article titles, excerpts or content exceed the allowed length.";
  }
  if (typeof body.published !== "boolean") {
    return "Choose whether this article should be published.";
  }
  return null;
}

function cookieValue(request, name) {
  const cookieHeader = request.headers.cookie || "";
  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return pair ? pair.slice(name.length + 1) : "";
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie",
    SESSION_COOKIE + "=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age="
    + (SESSION_DAYS * 24 * 60 * 60) + secure);
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + secure);
}

async function currentUser(request, pool) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
     FROM public.login_sessions s
     JOIN public.astro_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.role = 'customer'`,
    [hashSessionToken(token)]
  );
  return result.rows[0] || null;
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function rateLimited(request, endpoint, response) {
  const now = Date.now();
  const ip = request.socket.remoteAddress || "unknown";
  const key = endpoint + ":" + ip;
  const previous = rateLimits.get(key);
  if (!previous || previous.startedAt + RATE_WINDOW_MS <= now) {
    rateLimits.set(key, { startedAt: now, attempts: 1 });
    return false;
  }
  previous.attempts += 1;
  if (previous.attempts <= RATE_MAX_ATTEMPTS) return false;
  const retrySeconds = Math.ceil((previous.startedAt + RATE_WINDOW_MS - now) / 1000);
  response.setHeader("Retry-After", String(retrySeconds));
  sendJson(response, 429, { error: "Too many attempts. Please wait before trying again." });
  return true;
}

function articleValues(body) {
  return [
    body.slug.trim(),
    body.title_en.trim(),
    body.title_hi.trim(),
    body.excerpt_en.trim(),
    body.excerpt_hi.trim(),
    body.content_en.trim(),
    body.content_hi.trim(),
    body.published
  ];
}

async function createLoginSession(client, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  await client.query(
    "INSERT INTO public.login_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 years')",
    [tokenHash, userId]
  );
  return token;
}

async function requireCustomerConversation(pool, customerId) {
  if (!/^\d+$/.test(String(customerId || ""))) return false;
  const result = await pool.query(
    `SELECT u.id
     FROM public.astro_users u
     JOIN public.astro_chat_consents c ON c.customer_id = u.id
     WHERE u.id = $1 AND u.role = 'customer'`,
    [customerId]
  );
  return result.rowCount > 0;
}

async function handleApi(request, response, requestUrl, pool, chatConnections) {
  const pathname = requestUrl.pathname;
  const method = request.method;
  if (method === "POST" && !sameOrigin(request)) {
    sendJson(response, 403, { error: "This request must come from the website." });
    return;
  }
  if (method === "POST" && !request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    sendJson(response, 415, { error: "Content-Type must be application/json." });
    return;
  }
  if (pathname === "/api/me" && method === "GET") {
    const user = await currentUser(request, pool);
    if (user) {
      const token = cookieValue(request, SESSION_COOKIE);
      await pool.query(
        "UPDATE public.login_sessions SET expires_at = NOW() + INTERVAL '10 years' WHERE token_hash = $1",
        [hashSessionToken(token)]
      );
      setSessionCookie(response, token);
    }
    sendJson(response, 200, { user: user ? { id: String(user.id), firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role, createdAt: user.created_at } : null });
    return;
  }
  if ((pathname === "/api/signup" || pathname === "/api/login") && method === "POST") {
    if (rateLimited(request, pathname, response)) return;
    const body = await readJson(request);
    const validationError = validateCredentials(body, { requireName: pathname === "/api/signup" });
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }
    const email = body.email.trim().toLowerCase();
    if (pathname === "/api/signup") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const passwordHash = await hashPassword(body.password);
        const inserted = await client.query(
          "INSERT INTO public.astro_users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'customer') RETURNING id, first_name, last_name, email, role",
          [body.firstName.trim(), body.lastName.trim(), email, passwordHash]
        );
        const token = await createLoginSession(client, inserted.rows[0].id);
        await client.query("COMMIT");
        setSessionCookie(response, token);
        sendJson(response, 201, { user: { id: String(inserted.rows[0].id), firstName: inserted.rows[0].first_name, lastName: inserted.rows[0].last_name, email: inserted.rows[0].email, role: inserted.rows[0].role } });
      } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
          sendJson(response, 409, { error: "An account with this email already exists." });
        } else {
          throw error;
        }
      } finally {
        client.release();
      }
      return;
    }
    const result = await pool.query(
      "SELECT id, email, role, password_hash FROM public.astro_users WHERE email = $1 AND role = 'customer'",
      [email]
    );
    const user = result.rows[0];
    const valid = user ? await verifyPassword(body.password, user.password_hash) : false;
    if (!valid) {
      sendJson(response, 401, { error: "Email or password is incorrect." });
      return;
    }
    const client = await pool.connect();
    try {
      const token = await createLoginSession(client, user.id);
      setSessionCookie(response, token);
      sendJson(response, 200, { user: { id: String(user.id), email: user.email, role: user.role } });
    } finally {
      client.release();
    }
    return;
  }
  if (pathname === "/api/password" && method === "POST") {
    if (rateLimited(request, pathname, response)) return;
    const user = await currentUser(request, pool);
    if (!user) {
      sendJson(response, 401, { error: "Sign in to change your password." });
      return;
    }
    const body = await readJson(request);
    const validationError = validateCredentials({ email: user.email, password: body && body.newPassword });
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }
    if (!body || typeof body.currentPassword !== "string" || typeof body.confirmPassword !== "string") {
      sendJson(response, 400, { error: "Enter your current password and confirm the new password." });
      return;
    }
    if (body.newPassword !== body.confirmPassword) {
      sendJson(response, 400, { error: "New passwords do not match." });
      return;
    }
    const account = await pool.query(
      "SELECT password_hash FROM public.astro_users WHERE id = $1 AND role = 'customer'",
      [user.id]
    );
    const matches = account.rows[0] && await verifyPassword(body.currentPassword, account.rows[0].password_hash);
    if (!matches) {
      sendJson(response, 401, { error: "Current password is incorrect." });
      return;
    }
    const passwordHash = await hashPassword(body.newPassword);
    await pool.query("UPDATE public.astro_users SET password_hash = $1 WHERE id = $2", [passwordHash, user.id]);
    sendJson(response, 200, { ok: true });
    return;
  }
  if (pathname === "/api/logout" && method === "POST") {
    const token = cookieValue(request, SESSION_COOKIE);
    if (/^[a-f0-9]{64}$/.test(token)) {
      const user = await currentUser(request, pool);
      await pool.query("DELETE FROM public.login_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
      if (user) {
        chatConnections.forEach((connection) => {
          if (String(connection.user.id) === String(user.id)) connection.socket.close(1008, "Signed out");
        });
      }
    }
    clearSessionCookie(response);
    sendJson(response, 200, { ok: true });
    return;
  }
  if (pathname === "/api/pooja-enquiries" && method === "POST") {
    if (rateLimited(request, pathname, response)) return;
    const body = await readJson(request);
    const validationError = validatePoojaEnquiry(body);
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }
    await pool.query(
      `INSERT INTO public.pooja_enquiries
        (name, mobile, address, pooja_type, mode, preferred_language, preferred_date, preferred_time, privacy_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [body.name.trim(), body.mobile.trim(), body.address.trim(), body.poojaType, body.mode, body.preferredLanguage, body.preferredDate, body.preferredTime]
    );
    sendJson(response, 201, { ok: true });
    return;
  }
  if (pathname === "/api/enquiries" && method === "POST") {
    const body = await readJson(request);
    const validationError = validateEnquiry(body);
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }
    const user = await currentUser(request, pool);
    await pool.query(
      `INSERT INTO public.consultation_enquiries
        (enquiry_type, user_id, name, mobile, preferred_language, consultation_type,
         preferred_date, preferred_time, message, privacy_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        body.enquiryType,
        user ? user.id : null,
        body.name.trim(),
        body.mobile.trim(),
        body.preferredLanguage,
        body.enquiryType === "consultation" ? body.consultationType : null,
        body.enquiryType === "consultation" ? body.preferredDate : null,
        body.enquiryType === "consultation" ? body.preferredTime : null,
        body.message ? body.message.trim() : null,
        true
      ]
    );
    sendJson(response, 201, { ok: true });
    return;
  }
  if (pathname === "/api/enquiries" && method === "GET") {
    const user = await currentUser(request, pool);
    if (!user) {
      sendJson(response, 401, { error: "Sign in to view your enquiries." });
      return;
    }
    const result = user.role === "admin"
      ? await pool.query(
        `SELECT e.id, e.enquiry_type, e.name, e.mobile, e.preferred_language,
                e.consultation_type, e.preferred_date, e.preferred_time, e.message,
                e.created_at, u.email
         FROM public.consultation_enquiries e
         LEFT JOIN public.astro_users u ON u.id = e.user_id
         ORDER BY e.created_at DESC LIMIT 500`
      )
      : await pool.query(
        `SELECT id, enquiry_type, name, mobile, preferred_language,
                consultation_type, preferred_date, preferred_time, message, created_at
         FROM public.consultation_enquiries
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 100`,
        [user.id]
      );
    sendJson(response, 200, { enquiries: result.rows });
    return;
  }
  if (pathname.startsWith("/api/chat/")) {
    const user = await currentUser(request, pool);
    if (!user) {
      sendJson(response, 401, { error: "Sign in to use private chat." });
      return;
    }
    if (pathname === "/api/chat/consent" && method === "GET") {
      if (user.role === "admin") {
        sendJson(response, 200, { accepted: true });
        return;
      }
      const result = await pool.query(
        "SELECT 1 FROM public.astro_chat_consents WHERE customer_id = $1",
        [user.id]
      );
      sendJson(response, 200, { accepted: result.rowCount > 0 });
      return;
    }
    if (pathname === "/api/chat/consent" && method === "POST") {
      if (user.role !== "customer") {
        sendJson(response, 403, { error: "Only customer accounts can start a private chat." });
        return;
      }
      const body = await readJson(request);
      if (!body || body.consent !== true) {
        sendJson(response, 400, { error: "Chat privacy consent is required." });
        return;
      }
      await pool.query(
        "INSERT INTO public.astro_chat_consents (customer_id) VALUES ($1) ON CONFLICT (customer_id) DO NOTHING",
        [user.id]
      );
      sendJson(response, 200, { accepted: true });
      return;
    }
    if (pathname === "/api/chat/conversations" && method === "GET") {
      if (user.role !== "admin") {
        sendJson(response, 403, { error: "Only the astrologer can view the conversation list." });
        return;
      }
      const result = await pool.query(
        `SELECT DISTINCT ON (m.customer_id)
           m.customer_id::text AS customer_id, u.email, m.message, m.created_at
         FROM public.astro_chat_messages m
         JOIN public.astro_users u ON u.id = m.customer_id
         ORDER BY m.customer_id, m.id DESC`
      );
      sendJson(response, 200, { conversations: result.rows });
      return;
    }
    if (pathname === "/api/chat/messages" && method === "GET") {
      const requestedCustomerId = requestUrl.searchParams.get("customerId");
      const customerId = user.role === "admin" ? requestedCustomerId : String(user.id);
      if (user.role === "admin" && !(await requireCustomerConversation(pool, customerId))) {
        sendJson(response, 404, { error: "Chat conversation not found." });
        return;
      }
      if (user.role === "customer") {
        const consent = await pool.query(
          "SELECT 1 FROM public.astro_chat_consents WHERE customer_id = $1",
          [user.id]
        );
        if (consent.rowCount === 0) {
          sendJson(response, 403, { error: "Accept the chat privacy notice before using chat." });
          return;
        }
      }
      const result = await pool.query(
        `SELECT id::text AS id, customer_id::text AS customer_id,
                sender_id::text AS sender_id, message, created_at
         FROM (
           SELECT id, customer_id, sender_id, message, created_at
           FROM public.astro_chat_messages
           WHERE customer_id = $1
           ORDER BY id DESC
           LIMIT 100
         ) recent_messages
         ORDER BY id ASC`,
        [customerId]
      );
      sendJson(response, 200, { messages: result.rows });
      return;
    }
    sendJson(response, 404, { error: "Chat resource not found." });
    return;
  }
  if (pathname === "/api/feedback" && method === "GET") {
    const result = await pool.query(
      `SELECT id::text AS id, rating, message, created_at
       FROM public.astro_customer_feedback
       WHERE is_public = TRUE
       ORDER BY created_at DESC
       LIMIT 100`
    );
    sendJson(response, 200, { feedback: result.rows });
    return;
  }
  if (pathname === "/api/feedback/mine") {
    const user = await currentUser(request, pool);
    if (!user || user.role !== "customer") {
      sendJson(response, 401, { error: "Sign in with a customer account to manage feedback." });
      return;
    }
    if (method === "GET") {
      const result = await pool.query(
        `SELECT rating, message, public_consent
         FROM public.astro_customer_feedback
         WHERE customer_id = $1`,
        [user.id]
      );
      sendJson(response, 200, { feedback: result.rows[0] || null });
      return;
    }
    if (method === "POST") {
      const body = await readJson(request);
      const message = typeof body?.message === "string" ? body.message.trim() : "";
      if (!Number.isInteger(body?.rating) || body.rating < 1 || body.rating > 5
          || message.length < 10 || message.length > MAX_CHAT_MESSAGE_LENGTH
          || body.publicConsent !== true) {
        sendJson(response, 400, { error: "Choose a 1–5 star rating, write at least 10 characters, and agree to public display." });
        return;
      }
      const result = await pool.query(
        `INSERT INTO public.astro_customer_feedback
           (customer_id, rating, message, public_consent, is_public)
         VALUES ($1, $2, $3, TRUE, TRUE)
         ON CONFLICT (customer_id) DO UPDATE SET
           rating = EXCLUDED.rating,
           message = EXCLUDED.message,
           public_consent = TRUE,
           is_public = TRUE,
           updated_at = NOW()
         RETURNING rating, message, public_consent`,
        [user.id, body.rating, message]
      );
      sendJson(response, 200, { feedback: result.rows[0] });
      return;
    }
    sendJson(response, 405, { error: "Use GET or POST for your feedback." });
    return;
  }
  if (pathname === "/api/articles" && method === "GET") {
    const result = await pool.query(
      `SELECT id, slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, created_at
       FROM public.site_articles WHERE published = TRUE ORDER BY created_at DESC`
    );
    sendJson(response, 200, { articles: result.rows });
    return;
  }
  if (pathname.startsWith("/api/admin/")) {
    const user = await currentUser(request, pool);
    if (!user || user.role !== "admin") {
      sendJson(response, 403, { error: "This account does not have access to this resource." });
      return;
    }
    if (pathname === "/api/admin/articles" && method === "GET") {
      const result = await pool.query(
        `SELECT id, slug, title_en, title_hi, excerpt_en, excerpt_hi,
                content_en, content_hi, published, created_at, updated_at
         FROM public.site_articles ORDER BY updated_at DESC`
      );
      sendJson(response, 200, { articles: result.rows });
      return;
    }
    if (pathname === "/api/admin/feedback" && method === "GET") {
      const result = await pool.query(
        `SELECT f.id::text AS id, u.email, f.rating, f.message,
                f.is_public, f.created_at
         FROM public.astro_customer_feedback f
         JOIN public.astro_users u ON u.id = f.customer_id
         ORDER BY f.created_at DESC
         LIMIT 500`
      );
      sendJson(response, 200, { feedback: result.rows });
      return;
    }
    const feedbackMatch = pathname.match(/^\/api\/admin\/feedback\/(\d+)$/);
    if (feedbackMatch && method === "DELETE") {
      const result = await pool.query(
        "DELETE FROM public.astro_customer_feedback WHERE id = $1 RETURNING id",
        [feedbackMatch[1]]
      );
      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "Feedback not found." });
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }
    const articleMatch = pathname.match(/^\/api\/admin\/articles\/(\d+)$/);
    if (pathname === "/api/admin/articles" && method === "POST") {
      const body = await readJson(request);
      const validationError = validateArticle(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      const result = await pool.query(
        `INSERT INTO public.site_articles
          (slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        articleValues(body)
      );
      sendJson(response, 201, { id: result.rows[0].id });
      return;
    }
    if (articleMatch && method === "PUT") {
      const body = await readJson(request);
      const validationError = validateArticle(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      const result = await pool.query(
        `UPDATE public.site_articles SET
           slug = $1, title_en = $2, title_hi = $3, excerpt_en = $4, excerpt_hi = $5,
           content_en = $6, content_hi = $7, published = $8, updated_at = NOW()
         WHERE id = $9 RETURNING id`,
        articleValues(body).concat(articleMatch[1])
      );
      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "Article not found." });
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }
    if (articleMatch && method === "DELETE") {
      const result = await pool.query("DELETE FROM public.site_articles WHERE id = $1 RETURNING id", [articleMatch[1]]);
      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "Article not found." });
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }
    sendJson(response, 404, { error: "Admin resource not found." });
    return;
  }
  sendJson(response, 404, { error: "API endpoint not found." });
}

function staticFileFor(pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith(".") || segment === "node_modules" || segment === "database")) {
    return null;
  }
  if (segments.length === 1 && !/^[a-z0-9-]+\.html$/i.test(segments[0])) return null;
  if (segments.length > 1 && segments[0] !== "assets") return null;
  const filePath = path.resolve(ROOT, "." + normalizedPath);
  if (!filePath.startsWith(ROOT + path.sep) || !MIME_TYPES[path.extname(filePath).toLowerCase()]) return null;
  return filePath;
}

function publicWhatsAppNumber() {
  const number = String(process.env.WHATSAPP_NUMBER || "918319482309").replace(/\D/g, "");
  return /^\d{7,15}$/.test(number) ? number : "918319482309";
}

function publicWhatsAppDisplayNumber() {
  const number = publicWhatsAppNumber();
  return number.startsWith("91") && number.length === 12
    ? "+91 " + number.slice(2, 7) + " " + number.slice(7)
    : "+" + number;
}

function createApplication(pool) {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  const chatConnections = new Set();
  const server = http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    let requestUrl;
    try {
      requestUrl = new URL(request.url, "http://localhost");
    } catch {
      sendJson(response, 400, { error: "Invalid request URL." });
      return;
    }
    try {
      if (requestUrl.pathname.startsWith("/api/")) {
        await handleApi(request, response, requestUrl, pool, chatConnections);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "Method not allowed." });
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(requestUrl.pathname);
      } catch {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid URL path.");
        return;
      }
      const filePath = staticFileFor(pathname);
      if (!filePath) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      let content = await fs.promises.readFile(filePath);
      if ([".html", ".js"].includes(path.extname(filePath).toLowerCase())) {
        const source = content.toString("utf8");
        content = Buffer.from(source
          .replaceAll("918319482309", publicWhatsAppNumber())
          .replaceAll("+91 83194 82309", publicWhatsAppDisplayNumber()));
      }
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()],
        "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600"
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      console.error("Website request failed:", error);
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      sendJson(response, 500, { error: "The request could not be completed." });
    }
  });
  server.on("upgrade", async (request, socket, head) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url, "http://localhost");
    } catch {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      return;
    }
    if (requestUrl.pathname !== "/ws/chat" || !sameOrigin(request)) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    try {
      const user = await currentUser(request, pool);
      if (!user) {
        socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        return;
      }
      if (user.role === "customer") {
        const consent = await pool.query(
          "SELECT 1 FROM public.astro_chat_consents WHERE customer_id = $1",
          [user.id]
        );
        if (consent.rowCount === 0) {
          socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
          return;
        }
      }
      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        const connection = { socket: webSocket, user, windowAt: Date.now(), messageCount: 0 };
        chatConnections.add(connection);
        webSocket.on("close", () => chatConnections.delete(connection));
        webSocket.on("message", async (data) => {
          const now = Date.now();
          if (now - connection.windowAt >= CHAT_RATE_WINDOW_MS) {
            connection.windowAt = now;
            connection.messageCount = 0;
          }
          connection.messageCount += 1;
          if (connection.messageCount > CHAT_RATE_MAX_MESSAGES) {
            webSocket.send(JSON.stringify({ type: "error", message: "Please wait before sending more messages." }));
            webSocket.close(1008, "Rate limit exceeded");
            return;
          }
          let body;
          try {
            body = JSON.parse(data.toString());
          } catch {
            webSocket.send(JSON.stringify({ type: "error", message: "Message must be valid JSON." }));
            return;
          }
          if (!body || body.type !== "message" || typeof body.message !== "string") {
            webSocket.send(JSON.stringify({ type: "error", message: "Invalid chat message." }));
            return;
          }
          const message = body.message.trim();
          if (!message || Array.from(message).length > MAX_CHAT_MESSAGE_LENGTH) {
            webSocket.send(JSON.stringify({ type: "error", message: "Messages must be between 1 and 2000 characters." }));
            return;
          }
          let customerId = String(connection.user.id);
          if (connection.user.role === "admin") {
            customerId = String(body.customerId || "");
            try {
              if (!(await requireCustomerConversation(pool, customerId))) {
                webSocket.send(JSON.stringify({ type: "error", message: "Chat conversation not found." }));
                return;
              }
            } catch (error) {
              console.error("Could not verify the chat conversation:", error);
              webSocket.send(JSON.stringify({ type: "error", message: "The message could not be sent. Please try again." }));
              return;
            }
          }
          try {
            const result = await pool.query(
              `INSERT INTO public.astro_chat_messages (customer_id, sender_id, message)
               VALUES ($1, $2, $3)
               RETURNING id::text AS id, customer_id::text AS customer_id,
                         sender_id::text AS sender_id, message, created_at`,
              [customerId, connection.user.id, message]
            );
            const event = JSON.stringify({ type: "message", message: result.rows[0] });
            chatConnections.forEach((recipient) => {
              if (recipient.socket.readyState === WebSocket.OPEN
                  && (recipient.user.role === "admin" || String(recipient.user.id) === customerId)) {
                recipient.socket.send(event);
              }
            });
          } catch (error) {
            console.error("Could not save chat message:", error);
            webSocket.send(JSON.stringify({ type: "error", message: "The message could not be saved. Please try again." }));
          }
        });
      });
    } catch (error) {
      console.error("Could not authorize chat connection:", error);
      if (!socket.destroyed) socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    }
  });
  server.on("close", () => {
    chatConnections.forEach((connection) => connection.socket.terminate());
  });
  return server;
}

async function start() {
  const pool = new Pool(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : undefined);
  try {
    await pool.query("SELECT 1");
    const schema = await fs.promises.readFile(path.resolve(__dirname, "../database/schema.sql"), "utf8");
    await pool.query(schema);
    await pool.query("DELETE FROM public.login_sessions WHERE expires_at <= NOW()");
  } catch (error) {
    await pool.end();
    console.error("Could not connect to PostgreSQL or initialize the Astrology database:", error.message);
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    await pool.end();
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const server = createApplication(pool);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Astro Alok Tripathi website and enquiry API listening on port ${port}`);
  });
  const shutdown = () => {
    server.close(() => pool.end().catch((error) => {
      console.error("Could not close the PostgreSQL connection pool:", error);
      process.exitCode = 1;
    }));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  const cleanup = setInterval(() => {
    pool.query("DELETE FROM public.login_sessions WHERE expires_at <= NOW()")
      .catch((error) => console.error("Could not remove expired sessions:", error));
  }, 60 * 60 * 1000);
  cleanup.unref();
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Website server failed to start:", error);
    process.exitCode = 1;
  });
}

module.exports = { createApplication, validateArticle, validateEnquiry };
