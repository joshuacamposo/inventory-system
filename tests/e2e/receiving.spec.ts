import { expect, test } from "@playwright/test";

test("staff can receive stock and inspect its movement history", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Imbentaryo" })).toBeVisible();
  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toBeVisible();

  await page
    .getByRole("button", { name: "Dawata ang stock", exact: true })
    .click();
  await page.getByLabel("Butang").selectOption("dock-01");
  await page.getByLabel("Kadaghanon").fill("8");
  await page.getByLabel("Lokasyon").selectOption("north-dc");
  await page.getByRole("button", { name: "Kumpirmaha ang pagdawat" }).click();

  await expect(page.getByRole("row", { name: /USB-C Dock.*50/ })).toBeVisible();
  await page.getByRole("button", { name: "Kasaysayan sa stock" }).click();
  await expect(
    page.getByText("Pagdawat sa stock", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("+8 piraso", { exact: true })).toBeVisible();
});

test("received stock persists at its selected facility after reload", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Dawata ang stock", exact: true })
    .click();
  await page.getByLabel("Butang").selectOption("dock-01");
  await page.getByLabel("Kadaghanon").fill("5");
  await page.getByLabel("Lokasyon").selectOption("east-hub");
  await page.getByRole("button", { name: "Kumpirmaha ang pagdawat" }).click();

  await page.getByRole("button", { name: "East Hub" }).click();
  await expect(page.getByRole("row", { name: /USB-C Dock.*33/ })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "East Hub" }).click();
  await expect(page.getByRole("row", { name: /USB-C Dock.*33/ })).toBeVisible();
  await page.getByRole("button", { name: "North DC" }).click();
  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toBeVisible();
});

test("malformed saved inventory recovers to the initial stock list", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "stockroom-inventory-v1",
      JSON.stringify({ items: [null], movements: [] }),
    );
  });

  await page.goto("/");

  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toBeVisible();
});
