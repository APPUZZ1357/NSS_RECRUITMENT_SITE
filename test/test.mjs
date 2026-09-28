// Checks the built index.html.  Run:  node test/test.mjs   (after building)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadStudents } from "../build/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
let failed = 0;
const check = (ok, msg) => { console.log((ok ? "PASS  " : "FAIL  ") + msg); if (!ok) failed++; };

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
try { new Function(scripts[scripts.length - 1]); check(true, "page script parses"); } catch (e) { check(false, "page script parses: " + e.message); }

const VAULT = JSON.parse(html.match(/var VAULT = (\{[\s\S]*?\});\n/)[1]);
const logic = html.match(/\/\* VAULT-LOGIC-START \*\/([\s\S]*?)\/\* VAULT-LOGIC-END \*\//)[1];
const { unlock } = new Function("VAULT", logic + "; return { unlock };")(VAULT);

const csv = path.join(root, "data", "students.csv");
if (!fs.existsSync(csv)) {
  console.log("(data/students.csv not found, skipping the per-student checks)");
} else {
  const config = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const students = loadStudents(fs.readFileSync(csv, "utf8"), config);
  let bad = 0;
  for (const s of students) {
    const words = s.name.split(/[^A-Za-z0-9]+/).filter((w) => w.length >= 3);
    const tries = [s.name, words[0], words[words.length - 1], s.name.toLowerCase().replace(/[^a-z0-9]/g, "")];
    for (const t of tries) {
      const r = await unlock(t, "  " + s.code.toLowerCase() + " ");
      if (!(r && r.name === s.name && r.code === s.code && JSON.stringify(r.stages) === JSON.stringify(s.stages) && r.selected === s.selected)) { bad++; console.log("   cannot open:", s.name, "typed", t); }
    }
  }
  check(bad === 0, `${students.length} students open with full name, first word, last word and joined name`);
  const wrong = students.slice(0, 5);
  let leaked = 0;
  for (const s of wrong) { if (await unlock(s.name, s.code + "9")) leaked++; if (await unlock("Nobody", s.code)) leaked++; }
  check(leaked === 0, "wrong codes and wrong names are rejected");
  check(!students.some((s) => html.toLowerCase().includes(s.name.toLowerCase())), "no student name appears in readable form");
}
check(!/(?<![0-9A-Za-z])[6-9]\d{9}(?![0-9A-Za-z])|@gmail\.|drive\.google\.com/i.test(html), "no phone numbers, emails or Drive links in the page");
process.exit(failed ? 1 : 0);
