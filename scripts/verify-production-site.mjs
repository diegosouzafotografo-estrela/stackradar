import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "_site");
const page = path.join(site, "saas/construtores/melhores-construtores-de-site/index.html");

const required = [
  path.join(site, "index.html"),
  path.join(site, "styles.css"),
  path.join(site, "brand/logos/compact/elofirme-icon-orange.svg"),
  page
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(JSON.stringify({ status: "FAIL", reason: "missing_assets", missing }));
  process.exit(1);
}

const html = fs.readFileSync(page, "utf8");
const checks = {
  stylesheet: /href="\/styles\.css"/.test(html),
  logo: /src="\/brand\/logos\//.test(html),
  weeke_cta: /data-offer="weeke"[^>]*data-status="active"/.test(html),
  weeke_link: /https:\/\/central\.weeke\.com\.br\/aff\.php\?aff=48/.test(html),
  no_homologation_prefix: !/(?:href|src)="\/stackradar\//.test(html)
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(JSON.stringify({ status: "FAIL", failed }));
  process.exit(1);
}

console.log(JSON.stringify({ status: "PASS", checks }));
