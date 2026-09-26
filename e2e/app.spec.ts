import { test, expect } from "@playwright/test";

test("loads the app, verifies the draft, and renders the verification table", async ({
  page,
}) => {
  await page.goto("/");

  // Core chrome is present.
  await expect(page.getByRole("heading", { name: "TraceWrite" })).toBeVisible();
  await expect(page.getByLabel("Source documents")).toBeVisible();

  // Run verification on the seeded initial draft.
  await page.getByRole("button", { name: "Verify draft" }).click();

  // The verification table renders rows.
  const rows = page.getByTestId("claim-row");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.count()).toBeGreaterThan(0);

  // The groundedness summary appears.
  await expect(page.getByLabel("Groundedness summary")).toBeVisible();

  // At least one status badge is shown.
  await expect(page.locator(".badge").first()).toBeVisible();
});
