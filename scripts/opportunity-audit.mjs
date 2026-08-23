import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const postsDir = path.join(root, "_posts");
const catalogPath = path.join(root, "_data/affiliate-catalog.yml");
const outputDir = path.join(root, "docs");
const ignored = new Set(["elofirme.com.br", "github.com", "fonts.googleapis.com", "fonts.gstatic.com", "chatgpt.com"]);

const posts = fs.readdirSync(postsDir).filter((file) => file.endsWith(".md"));
const mentioned = new Map();
let articlesScanned = 0;
for (const file of posts) {
  const content = fs.readFileSync(path.join(postsDir, file), "utf8");
  if (/^published:\s*false\s*$/m.test(content)) continue;
  articlesScanned += 1;
  for (const match of content.matchAll(/https?:\/\/[^\s)\]>]+/g)) {
    try {
      const domain = new URL(match[0].replace(/[.,;]+$/, "")).hostname.replace(/^www\./, "");
      if (ignored.has(domain)) continue;
      const item = mentioned.get(domain) ?? { domain, mentions: 0, articles: new Set() };
      item.mentions += 1;
      item.articles.add(file);
      mentioned.set(domain, item);
    } catch { /* URL inválida não entra automaticamente na pesquisa. */ }
  }
}

const catalog = fs.readFileSync(catalogPath, "utf8");
const catalogDomains = new Set([...catalog.matchAll(/^\s*product_url:\s*(https?:\/\/\S+)$/gm)].map((match) => new URL(match[1]).hostname.replace(/^www\./, "")));
const candidates = [...mentioned.values()]
  .filter((item) => !catalogDomains.has(item.domain))
  .map((item) => ({ domain: item.domain, mentions: item.mentions, articles: [...item.articles].sort(), status: "research" }))
  .sort((a, b) => b.mentions - a.mentions || a.domain.localeCompare(b.domain));

const staleSources = [];
for (const match of catalog.matchAll(/- key:\s*([^\s]+)[\s\S]*?verified_on:\s*(\d{4}-\d{2}-\d{2})/g)) {
  if (Date.now() - new Date(`${match[2]}T00:00:00Z`).getTime() > 30 * 86400000) staleSources.push({ key: match[1], verified_on: match[2] });
}

const report = {
  schema_version: "1.0",
  generated_at: new Date().toISOString(),
  articles_scanned: articlesScanned,
  catalog_items: [...catalog.matchAll(/^- key:/gm)].length,
  candidates,
  stale_sources: staleSources
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "opportunity-scan.json"), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  "# Ciclo de oportunidades StackRadar",
  "",
  `Gerado em ${report.generated_at}. Artigos: ${report.articles_scanned}. Catálogo: ${report.catalog_items}.`,
  "",
  "## Produtos citados fora do catálogo",
  "",
  ...(candidates.length ? candidates.map((item) => `- **${item.domain}** — ${item.mentions} menções em ${item.articles.join(", ")}`) : ["- Nenhum."]),
  "",
  "## Fontes com mais de 30 dias",
  "",
  ...(staleSources.length ? staleSources.map((item) => `- **${item.key}** — verificada em ${item.verified_on}`) : ["- Nenhuma."]),
  "",
  "O Analista de Mercado deve validar fonte oficial, economia, elegibilidade e encaixe antes de alterar o catálogo."
];
fs.writeFileSync(path.join(outputDir, "opportunity-scan.md"), `${lines.join("\n")}\n`);
console.log(JSON.stringify({ status: "PASS", articles: report.articles_scanned, candidates: candidates.length, stale: staleSources.length }));
