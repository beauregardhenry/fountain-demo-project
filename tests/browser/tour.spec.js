// Drives the real tour in a browser: navigation, replay, draft mode and layout. Each test
// stands alone so the static test count in scripts/check-test-count.js matches what runs.
const { test, expect } = require("@playwright/test");
const tour = require("../../content/tour.json");

const withRecording = tour.chapters.filter((c) => c.recording);
const last = tour.chapters[tour.chapters.length - 1];

// Collects page errors and console errors so a test can assert there were none.
function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

async function open(page, id = "", speed = 1) {
  await page.goto(`/${speed === 1 ? "" : `?speed=${speed}`}#${id}`);
  await expect(page.locator("#chapter-title")).not.toBeEmpty();
}

test("the welcome screen shows the tour title and no demo panel", async ({ page }) => {
  await open(page);
  await expect(page.locator("#tour-title")).toHaveText(tour.title);
  await expect(page.locator("#chapter-title")).toHaveText("Welcome");
  await expect(page.locator("#stage")).toBeHidden();
  await expect(page.locator("#prev")).toBeDisabled();
});

test("arrow keys move between chapters and update the address", async ({ page }) => {
  await open(page);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`#${tour.chapters[1].id}$`));
  await expect(page.locator("#eyebrow")).toHaveText(`Chapter 1 of ${tour.chapters.length - 2}`);
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(`#${tour.chapters[0].id}$`));
});

test("the buttons reach the last chapter, where Next is disabled", async ({ page }) => {
  await open(page);
  for (let i = 1; i < tour.chapters.length; i++) await page.click("#next");
  await expect(page).toHaveURL(new RegExp(`#${last.id}$`));
  await expect(page.locator("#next")).toBeDisabled();
  await expect(page.locator("#eyebrow")).toHaveText("");
});

test("a link straight to a chapter opens that chapter", async ({ page }) => {
  await open(page, "secrets");
  await expect(page.locator("#chapter-title")).toHaveText("Sealed Secrets");
  await expect(page.locator(".dot.current")).toHaveAttribute("href", "#secrets");
});

test("an unknown chapter link falls back to the welcome screen", async ({ page }) => {
  await open(page, "no-such-chapter");
  await expect(page.locator("#chapter-title")).toHaveText("Welcome");
});

test("chapter 1's recording plays to the end and parks the machine", async ({ page }) => {
  await open(page, "computer", 20);
  await page.click("#play");
  await expect(page.locator("#play")).toHaveText("Play again");
  const rec = require(`../../${withRecording[0].recording}`);
  await expect(page.locator("#log li")).toHaveCount(rec.events.length);
  await expect(page.locator("#machine-state")).toHaveText("parked");
});

test("every recording plays to the end without errors", async ({ page }) => {
  const errors = watchErrors(page);
  for (const chapter of withRecording) {
    await open(page, chapter.id, 40);
    await page.click("#play");
    await expect(page.locator("#play")).toHaveText("Play again");
    await expect(page.locator("#log li")).toHaveCount(require(`../../${chapter.recording}`).events.length);
  }
  expect(errors).toEqual([]);
});

test("Space pauses and resumes playback", async ({ page }) => {
  await open(page, "computer");
  await page.keyboard.press(" ");
  await expect(page.locator("#play")).toHaveText("Pause");
  await page.keyboard.press(" ");
  await expect(page.locator("#play")).toHaveText("Play");
  const paused = await page.locator("#log li").count();
  await page.waitForTimeout(1500);
  await expect(page.locator("#log li")).toHaveCount(paused);
});

test("Restart clears the log and plays from the beginning", async ({ page }) => {
  await open(page, "computer", 20);
  await page.click("#play");
  await expect(page.locator("#play")).toHaveText("Play again");
  await page.click("#restart");
  await expect(page.locator("#log li").first()).toContainText("signup form");
  await expect(page.locator("#play")).toHaveText("Pause");
});

test("moving to another chapter stops the demo and clears it", async ({ page }) => {
  await open(page, "computer");
  await page.click("#play");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#chapter-title")).toHaveText("The Parking Lot");
  await expect(page.locator("#log li")).toHaveCount(0);
  await expect(page.locator("#machine-state")).toHaveText("idle");
});

test("Under the hood starts closed and opens on click", async ({ page }) => {
  await open(page, "computer");
  const hood = page.locator("#hood");
  await expect(hood).not.toHaveAttribute("open", "");
  await expect(page.locator("#hood-body")).toBeHidden();
  await page.click("#hood summary");
  await expect(page.locator("#hood-body li").first()).toBeVisible();
});

test("draft mode shows the Draft badge and verify notes", async ({ page }) => {
  test.skip(!tour.draft, "the tour is not in draft mode");
  await open(page, "parking");
  await expect(page.locator("#draft-flag")).toBeVisible();
  await expect(page.locator("#draft-notes li").first()).toBeVisible();
});

test("placeholder recordings are labeled as illustrative", async ({ page }) => {
  for (const chapter of withRecording) {
    await open(page, chapter.id);
    const placeholder = require(`../../${chapter.recording}`).placeholder === true;
    await expect(page.locator("#placeholder-flag")).toBeVisible({ visible: placeholder });
  }
});

test("no chapter shows raw Markdown or verify markers in its text", async ({ page }) => {
  for (const chapter of tour.chapters) {
    await open(page, chapter.id);
    const text = await page.locator(".story").innerText();
    expect(text, chapter.id).not.toMatch(/\*\*|\[\[verify|^## /m);
  }
});

test("no chapter scrolls sideways", async ({ page }) => {
  for (const chapter of tour.chapters) {
    await open(page, chapter.id);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, chapter.id).toBeLessThanOrEqual(0);
  }
});
