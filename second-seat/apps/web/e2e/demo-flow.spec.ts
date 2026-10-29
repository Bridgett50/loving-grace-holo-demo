import { expect, test, type Page } from "@playwright/test";

// Collect browser console errors and uncaught page errors for one page.
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("C1-demo-flow-completes-all-nine-steps", async ({ page }) => {
  await page.goto("/meeting-room?demo=1");
  const next = page.locator("#demo-next");
  await expect(next).toBeEnabled();
  for (let i = 1; i <= 9; i++) {
    await expect(
      page.getByRole("status", { name: new RegExp(`^Demo step ${i} of 9`) }),
    ).toBeVisible();
    await next.click();
  }
  await expect(page.getByText("Demo complete")).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(page.getByText("Approved: yes · Send: sent")).toBeVisible();
  await expect(page.getByText("Sent — package locked.", { exact: false })).toBeVisible();
  await expect(page.locator("#evidence-export")).toBeVisible();
});

test("C2-demo-page-hydrates-without-console-errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/meeting-room?demo=1");
  await expect(page.locator("#demo-next")).toBeEnabled();
  await page.locator("#demo-next").click();
  await expect(
    page.getByRole("status", { name: /^Demo step 2 of 9/ }),
  ).toBeVisible();
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});

test("C3-keyboard-shortcuts-advance-and-restart", async ({ page }) => {
  await page.goto("/meeting-room?demo=1");
  await expect(page.locator("#demo-next")).toBeEnabled();
  await page.locator("body").press("ArrowRight");
  await expect(page.getByRole("status", { name: /^Demo step 2 of 9/ })).toBeVisible();
  await page.locator("body").press("n");
  await expect(page.getByRole("status", { name: /^Demo step 3 of 9/ })).toBeVisible();
  await page.locator("#guidance-input").focus();
  await page.keyboard.press("n");
  await expect(page.getByRole("status", { name: /^Demo step 3 of 9/ })).toBeVisible();
  await page.locator("#guidance-input").blur();
  await page.locator("body").press("r");
  await expect(page.getByRole("status", { name: /^Demo step 1 of 9/ })).toBeVisible();
});

test("C4-demo-card-hidden-without-demo-flag", async ({ page }) => {
  await page.goto("/meeting-room");
  await expect(page.locator("#mr-meeting-heading")).toBeVisible();
  await expect(page.locator("#demo-next")).toHaveCount(0);
});
