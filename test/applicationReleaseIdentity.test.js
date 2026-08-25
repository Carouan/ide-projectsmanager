import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

test("the package and lockfile share the public application identity", () => {
  const application = JSON.parse(read("package.json"));
  const lockfile = JSON.parse(read("package-lock.json"));

  assert.equal(application.name, "ide-projectsmanager");
  assert.equal(application.version, "1.0.0");
  assert.equal(lockfile.name, application.name);
  assert.equal(lockfile.version, application.version);
  assert.equal(lockfile.packages[""].name, application.name);
  assert.equal(lockfile.packages[""].version, application.version);
});

test("the HTML and installable application expose consistent public branding", () => {
  const html = read("index.html");
  const viteConfiguration = read("vite.config.js");

  assert.match(html, /<html lang="fr">/);
  assert.match(html, /<title>IDE Projects Manager — IDE de projet personnel<\/title>/);
  assert.match(html, /href="%BASE_URL%favicon\.ico"/);
  assert.match(viteConfiguration, /name: "IDE Projects Manager"/);
  assert.match(viteConfiguration, /short_name: "IDE Projects"/);
});

test("French and English settings identify the application version and documentation", () => {
  for (const locale of ["fr", "en"]) {
    const messages = JSON.parse(read(`src/i18n/${locale}.json`));

    assert.match(messages["settings.about.version"], /\{\{version\}\}/);
    assert.match(messages["global.hero.eyebrow"], /\{\{version\}\}/);
    assert.ok(messages["settings.about.repository"]);
    assert.ok(messages["settings.about.wiki"]);
  }
});
