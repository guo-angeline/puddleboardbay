#!/usr/bin/env node
// Rendered regression check for search combined with structured filters.
// Plain node + playwright. Usage: node scripts/verify-search.mjs [url]

import { chromium } from "playwright";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const cases = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
];
const results = [];

function record(viewport, check, ok, detail) {
  results.push({ viewport, check, ok, detail });
}

async function check(viewport, name, run) {
  try {
    const detail = await run();
    record(viewport, name, true, detail);
  } catch (error) {
    record(viewport, name, false, error.message);
  }
}

async function seedState(context) {
  await context.addInitScript(() => {
    localStorage.setItem("ptw-favorites", JSON.stringify([1]));
    localStorage.setItem("ptw-recent", JSON.stringify([]));
    const today = [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getDate()).padStart(2, "0"),
    ].join("-");
    localStorage.setItem("ptw-paddle-now-seen", today);
  });
}

async function verifyViewport(browser, testCase) {
  const { name, viewport } = testCase;
  const context = await browser.newContext({ viewport });
  try {
    await seedState(context);
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    const ordinaryCards = page.locator('button[aria-label="Watch this spot"]');
    await check(name, "normal catalog renders initially", async () => {
      await page.waitForFunction(() => document.querySelectorAll('button[aria-label="Watch this spot"]').length > 0);
      const count = await ordinaryCards.count();
      if (count < 1) throw new Error("no ordinary catalog cards rendered");
      return `${count} ordinary cards`;
    });

    await page.getByRole("button", { name: "South Bay", exact: true }).click();

    if (name === "mobile") {
      await page.getByRole("button", { name: "Open search" }).click();
    }
    const search = page.getByRole("textbox", { name: "Search spots" });
    await search.fill("zzzz-no-such-paddle-spot");

    if (name === "mobile") {
      await check(name, "map count reaches zero", async () => {
        await page.getByRole("button", { name: "Map (0)", exact: true }).waitFor({ state: "visible" });
      });
      await page.getByRole("button", { name: "List", exact: true }).click();
    }

    const inlineStatus = page.getByRole("status").filter({ hasText: "No spots match" });
    await check(name, "one seeded Watching card remains", async () => {
      const saved = page.getByRole("button", { name: "Stop watching this spot", exact: true });
      await saved.first().waitFor({ state: "visible", timeout: 15000 });
      const count = await saved.count();
      if (count !== 1) throw new Error(`expected 1 Watching card, found ${count}`);
    });
    await check(name, "scoped inline empty action follows Watching", async () => {
      await inlineStatus.waitFor({ state: "visible", timeout: 15000 });
      await inlineStatus.getByRole("button", { name: "Clear search and filters", exact: true }).waitFor({ state: "visible" });
      const follows = await inlineStatus.evaluate((status) => {
        const heading = [...document.querySelectorAll("span")].find((node) => node.textContent === "Watching");
        return !!heading && !!(heading.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      if (!follows) throw new Error("inline empty status does not follow Watching");
    });
    await check(name, "ordinary catalog cards are absent at zero matches", async () => {
      const count = await ordinaryCards.count();
      if (count !== 0) throw new Error(`found ${count} ordinary catalog cards`);
    });

    await page.getByRole("button", { name: "Clear search", exact: true }).first().click();

    await check(name, "clear empties the query", async () => {
      await page.waitForFunction(() => {
        const input = document.querySelector('input[aria-label="Search spots"]');
        return input instanceof HTMLInputElement && input.value === "";
      });
    });
    await check(name, "region filter remains active", async () => {
      const retained = await page.getByRole("button", { name: "South Bay", exact: true }).evaluate((button) => {
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
        return getComputedStyle(button).backgroundColor === accent
          || button.getAttribute("style")?.includes("var(--accent)");
      });
      if (!retained) throw new Error("South Bay region pill is not active");
    });
    await check(name, "region catalog returns after clear", async () => {
      await ordinaryCards.first().waitFor({ state: "visible", timeout: 15000 });
      const count = await ordinaryCards.count();
      if (count < 1) throw new Error("South Bay catalog did not return");
      return `${count} ordinary cards`;
    });
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const testCase of cases) {
      await verifyViewport(browser, testCase);
    }
  } finally {
    await browser.close();
  }

  let allPassed = true;
  for (const { viewport, check: name, ok, detail } of results) {
    if (!ok) allPassed = false;
    console.log(`${ok ? "PASS" : "FAIL"}  [${viewport}] ${name}${detail ? `: ${detail}` : ""}`);
  }
  console.log(
    allPassed
      ? `\nAll search regression checks passed against ${baseUrl}.`
      : `\nOne or more search regression checks failed against ${baseUrl}.`,
  );
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("verify-search.mjs crashed:", error);
  process.exit(1);
});
