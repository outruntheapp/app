// POST /api/admin/ticket-holders
// Multipart: challenge_id, file (CSV with Name, email, ID number). Admin only. Upsert into challenge_ticket_holders.

import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./requireAdmin";
import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headerLine = lines[0];
  const headers = headerLine.split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;\t]/).map((v) => v.trim());
    const row = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { supabase } = admin;

  const form = new IncomingForm({ maxFileSize: 5 * 1024 * 1024 });
  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const challengeIdRaw = fields?.challenge_id?.[0] ?? fields?.challenge_id ?? "";
  const effectiveChallengeId = (typeof challengeIdRaw === "string" ? challengeIdRaw : "").trim();
  if (!effectiveChallengeId) {
    return res.status(400).json({ error: "challenge_id required" });
  }

  const file = files?.file?.[0] ?? files?.csv?.[0] ?? Object.values(files ?? {}).flat()[0];

  if (!file?.filepath) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  let csvText;
  try {
    csvText = await readFile(file.filepath, "utf-8");
  } catch (e) {
    return res.status(400).json({ error: "Could not read file" });
  }

  const { rows } = parseCsv(csvText);
  const emailAliases = ["email", "e-mail", "email address"];
  const nameAliases = ["name", "full name", "fullname", "runner"];
  const idNumberAliases = ["rsa id", "rsa id number", "id number", "rsa_id", "id_number"];

  const findCol = (row, aliases) => {
    const key = Object.keys(row).find((k) => aliases.some((a) => k.includes(a) || a.includes(k)));
    return key ? row[key] : "";
  };

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = normalizeEmail(findCol(row, emailAliases));
    if (!email) {
      skipped++;
      errors.push({ row: i + 2, message: "Missing email" });
      continue;
    }
    const name = (findCol(row, nameAliases) || "").trim() || null;
    const idNumber = (findCol(row, idNumberAliases) || "").trim() || null;

    const { error } = await supabase
      .from("challenge_ticket_holders")
      .upsert(
        {
          challenge_id: effectiveChallengeId,
          email,
          name,
          id_number: idNumber,
          source: "entry_ninja_csv",
        },
        { onConflict: "challenge_id,email" }
      );

    if (error) {
      errors.push({ row: i + 2, message: error.message });
      skipped++;
    } else {
      imported++;
    }
  }

  return res.status(200).json({ imported, skipped, errors: errors.length ? errors : undefined });
}
