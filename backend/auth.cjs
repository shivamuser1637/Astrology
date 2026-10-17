"use strict";

const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const PASSWORD_BYTES_MIN = 12;
const PASSWORD_BYTES_MAX = 256;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return "scrypt$" + salt.toString("hex") + "$" + derivedKey.toString("hex");
}

async function verifyPassword(password, passwordHash) {
  const parts = passwordHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) {
    return false;
  }
  const expected = Buffer.from(parts[2], "hex");
  const actual = await scrypt(password, Buffer.from(parts[1], "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function validateCredentials(body, options) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Enter a valid email address and password.";
  }
  const loginName = typeof body.email === "string" ? body.email.trim() : "";
  const isEmail = loginName.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginName);
  if (!isEmail) {
    return "Enter a valid email address.";
  }
  if (typeof body.password !== "string"
      || Buffer.byteLength(body.password, "utf8") < PASSWORD_BYTES_MIN
      || Buffer.byteLength(body.password, "utf8") > PASSWORD_BYTES_MAX) {
    return "Use a password that is at least 12 characters long.";
  }
  if (options && options.requireName) {
    for (const field of ["firstName", "lastName"]) {
      if (typeof body[field] !== "string" || !body[field].trim() || body[field].trim().length > 80) {
        return field === "firstName" ? "Enter your first name (up to 80 characters)." : "Enter your last name (up to 80 characters).";
      }
    }
  }
  return null;
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = { hashPassword, hashSessionToken, validateCredentials, verifyPassword };
