import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve(import.meta.dirname, "../_data/affiliate-catalog.yml");
const source = fs.readFileSync(catalogPath, "utf8");
const records = source.split(/\n(?=- key:)/).filter(Boolean).map((block) => {
  const value = (name) => block.match(new RegExp(name === "key" ? `^- key:\\s*(.*)$` : `^\\s*${name}:\\s*(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
  return { key: value("key"), status: value("status"), affiliate_url: value("affiliate_url"), product_url: value("product_url") };
});

const active = records.filter((item) => item.status === "active");
const missing = active.filter((item) => !item.affiliate_url);
const results = [];
for (const item of active.filter((item) => item.affiliate_url)) {
  try {
    const response = await fetch(item.affiliate_url, { redirect: "manual" });
    results.push({
      key: item.key,
      status: response.status,
      location: response.headers.get("location") ?? "",
      attribution_cookie: Boolean(response.headers.get("set-cookie"))
    });
  } catch (error) {
    results.push({ key: item.key, status: "ERROR", error: error.message });
  }
}

const failed = [
  ...missing.map((item) => `${item.key}: active without affiliate_url`),
  ...results.filter((item) => item.status === "ERROR" || (item.status < 200 || item.status >= 400)).map((item) => `${item.key}: HTTP ${item.status}`)
];
const report = { status: failed.length ? "FAIL" : "PASS", active_count: active.length, results, failed };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
