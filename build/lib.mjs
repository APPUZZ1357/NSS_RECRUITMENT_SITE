// Small helpers shared by build.mjs and test/test.mjs. No dependencies.

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  const endRow = () => { row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; endRow(); }
    else cell += c;
  }
  endRow();
  return rows;
}

// Turns students.csv into a checked list of students. Throws a clear message on any problem.
export function loadStudents(csvText, config) {
  const table = parseCsv(csvText);
  if (!table.length) throw new Error("students.csv is empty");
  const head = table.shift().map((h) => h.trim().toLowerCase());
  const need = ["name", "code", "department", ...config.stages.map((_, i) => "stage" + (i + 1)), "result"];
  for (const n of need) {
    if (!head.includes(n)) throw new Error(`students.csv is missing the column "${n}". Columns found: ${head.join(", ")}`);
  }
  const at = (n) => head.indexOf(n);
  const students = [], seen = new Set();
  table.forEach((r, idx) => {
    const line = idx + 2, get = (n) => (r[at(n)] ?? "").trim();
    const name = get("name"), code = get("code");
    if (!name || !code) throw new Error(`Row ${line}: name and code are both required`);
    const key = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (seen.has(key)) throw new Error(`Row ${line}: the code "${code}" is used twice. Every student needs a unique code.`);
    seen.add(key);
    const stages = config.stages.map((st, i) => {
      const raw = get("stage" + (i + 1));
      if (raw === "") return null;                         // not finished yet
      if (raw.toLowerCase() === "absent") return "absent";  // did not attend
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > st.max)
        throw new Error(`Row ${line} (${name}): ${st.label} must be a number from 0 to ${st.max}, "absent", or empty. Got "${raw}"`);
      return v;
    });
    const result = get("result").toLowerCase();
    if (result !== "selected" && result !== "not selected")
      throw new Error(`Row ${line} (${name}): result must be "selected" or "not selected". Got "${get("result")}"`);
    students.push({ name, code: code.toUpperCase(), dept: get("department"), stages, selected: result === "selected" });
  });
  return students;
}
