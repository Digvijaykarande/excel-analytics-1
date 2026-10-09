const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/unused";

const { validateDataset, ValidationError } = require("../utils/validateDataset");
const { toNumber, inferType } = require("../utils/columns");
const ai = require("../controllers/aiController");
const app = require("../app");

const get = (server, path, headers = {}) => new Promise((resolve, reject) => {
  http.get({ port: server.address().port, path, headers }, (res) => {
    let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode, body }));
  }).on("error", reject);
});

test("validateDataset sanitises rows/columns", () => {
  const out = validateDataset({ name: "  Sales  ", sheets: [{ name: "S1", columns: [{ name: "a.b", type: "number" }, { name: "$x", type: "weird" }], rows: [[1], [2, "x", "extra"], [NaN, ""]] }] });
  assert.equal(out.name, "Sales");
  assert.equal(out.sheets[0].columns[1].type, "text");
  assert.deepEqual(out.sheets[0].rows, [[1, null], [2, "x"], [null, null]]);
  assert.equal(out.totalRows, 3);
});
test("validateDataset rejects bad payloads", () => {
  assert.throws(() => validateDataset({ name: "x", sheets: [] }), ValidationError);
  assert.throws(() => validateDataset({ sheets: [{ columns: [{ name: "a" }], rows: [] }] }), ValidationError);
  assert.throws(() => validateDataset({ name: "x", sheets: [{ name: "s", columns: [{ name: "a" }], rows: ["nope"] }] }), ValidationError);
});
test("toNumber / inferType handle messy values", () => {
  assert.equal(toNumber("$1,234.50"), 1234.5);
  assert.equal(toNumber("(200)"), -200);
  assert.equal(toNumber("45%"), 45);
  assert.equal(toNumber("abc"), null);
  assert.equal(inferType([1, 2, "3", "4"]), "number");
  assert.equal(inferType(["2024-01-02", "2024-02-03"]), "date");
  assert.equal(inferType(["a", "b", "a", "b"]), "category");
  assert.equal(inferType([1, 2, 3], "user_id"), "id");
});
test("routes: health ok, protected need token, 404 JSON, CORS blocks unknown origin", async () => {
  const server = app.listen(0);
  try {
    assert.equal((await get(server, "/health")).status, 200);
    for (const p of ["/api/datasets", "/api/users/me", "/api/admin/stats", "/api/ai/status"]) {
      const r = await get(server, p);
      assert.equal(r.status, 401, p);
      assert.ok(JSON.parse(r.body).msg);
    }
    assert.equal((await get(server, "/api/nope")).status, 404);
    assert.equal((await get(server, "/health", { Origin: "https://evil.example" })).status, 403);
  } finally { server.close(); }
});
test("AI insights sanitises model output and drops invalid charts", async () => {
  process.env.GROQ_API_KEY = "test";
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({
    headline: "H", summary: "S", findings: [{ title: "t", detail: "d", severity: "bogus" }], risks: ["r"], recommendations: ["x"],
    suggestedCharts: [{ title: "ok", type: "nonsense", x: "Region", y: "Sales", agg: "sum" }, { title: "bad" }],
  }) } }] }) });
  try {
    let result;
    await ai.insights({ body: { name: "n", profile: { rows: 1 }, sample: [] } }, { json: (v) => (result = v) });
    assert.equal(result.findings[0].severity, "info");
    assert.equal(result.suggestedCharts.length, 1);
    assert.equal(result.suggestedCharts[0].type, "bar");
    assert.deepEqual(result.suggestedCharts[0].y, ["Sales"]);
  } finally { global.fetch = realFetch; }
});
test("AI: missing key gives a clear 503", async () => {
  delete process.env.GROQ_API_KEY;
  await assert.rejects(() => ai.insights({ body: { profile: { a: 1 } } }, { json() {} }), (e) => e.status === 503);
});
