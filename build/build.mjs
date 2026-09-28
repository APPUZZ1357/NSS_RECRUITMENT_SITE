// Reads data/students.csv, encrypts every student's result, and writes index.html.
// Run:  node build/build.mjs      (needs Node 20 or newer)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadStudents } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => path.join(root, ...a);

const csvPath = p("data", "students.csv");
if (!fs.existsSync(csvPath)) {
  console.error("Missing data/students.csv.\nCopy data/students.example.csv to data/students.csv and fill in your students.");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(p("config.json"), "utf8"));
const students = loadStudents(fs.readFileSync(csvPath, "utf8"), config);
const template = fs.readFileSync(p("src", "template.html"), "utf8");
for (const ph of ["__STAGES__", "__VAULT__"]) {
  if (template.split(ph).length !== 2) throw new Error(`src/template.html must contain ${ph} exactly once`);
}

// Use the exact same key logic that the page uses, so build and browser always agree.
const logic = template.match(/\/\* VAULT-LOGIC-START \*\/([\s\S]*?)\/\* VAULT-LOGIC-END \*\//)[1];
const { nameKeys, clean, derive, bytesToB64 } = new Function(
  logic + "; return { nameKeys, clean, derive, bytesToB64 };"
)();

const vault = {};
for (const s of students) {
  const payload = JSON.stringify({ name: s.name, code: s.code, dept: s.dept, stages: s.stages, selected: s.selected });
  for (const k of nameKeys(s.name)) {
    const d = await derive(k, clean(s.code));
    if (vault[d.id]) throw new Error(`Two logins collide for ${s.name}. Change one of the codes.`);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey("raw", d.key, "AES-GCM", false, ["encrypt"]);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload)));
    vault[d.id] = [bytesToB64(iv), bytesToB64(ct)];
  }
}

const html = template
  .replace("__STAGES__", () => JSON.stringify(config.stages))
  .replace("__VAULT__", () => JSON.stringify(vault));
fs.writeFileSync(p("index.html"), html);

const sel = students.filter((s) => s.selected).length;
console.log(`Built index.html  (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`${students.length} students: ${sel} selected, ${students.length - sel} not selected`);
