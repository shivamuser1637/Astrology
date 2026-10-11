"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const { hashPassword } = require("./auth.cjs");
const { validateCredentials } = require("./auth.cjs");

function promptHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal to enter the admin password securely."));
      return;
    }
    const input = process.stdin;
    let value = "";
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    function finish(error) {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }
    function onData(character) {
      if (character === "\u0003") {
        finish(new Error("Admin setup cancelled."));
      } else if (character === "\r" || character === "\n") {
        finish();
      } else if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    }
    input.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2];
  const credentialsError = validateCredentials({ email, password: "placeholder-password" });
  if (!email || credentialsError === "Enter a valid email address.") {
    throw new Error("Usage: npm run create-admin -- astrologer@example.com");
  }

  const password = await promptHidden("Create admin password (minimum 12 characters): ");
  const confirmation = await promptHidden("Confirm admin password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  const validationError = validateCredentials({ email, password });
  if (validationError) throw new Error(validationError);

  const pool = new Pool();
  try {
    await pool.query("SELECT 1");
    const schema = await fs.promises.readFile(path.join(__dirname, "database", "schema.sql"), "utf8");
    await pool.query(schema);
    const admins = await pool.query("SELECT COUNT(*)::int AS count FROM public.astro_users WHERE role = 'admin'");
    if (admins.rows[0].count > 0) {
      throw new Error("An astrologer admin account already exists. Public sign-up cannot create admin accounts.");
    }
    const passwordHash = await hashPassword(password);
    await pool.query(
      "INSERT INTO public.astro_users (email, password_hash, role) VALUES ($1, $2, 'admin')",
      [email.trim().toLowerCase(), passwordHash]
    );
    console.log("Astrologer admin account created. Sign in at http://localhost:8000/login.html");
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Could not create the admin account:", error.message);
    process.exitCode = 1;
  });
}
