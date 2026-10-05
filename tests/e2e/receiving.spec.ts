import { expect, test } from "@playwright/test";

test("staff can receive stock and inspect its movement history", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.locator(".context-address")).toHaveText(
    "Iligan City, Philippines",
  );
  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toBeVisible();

  await page
    .getByRole("button", { name: "Receive stock", exact: true })
    .click();
  await page.getByLabel("Item").selectOption("dock-01");
  await page.getByLabel("Quantity").fill("8");
  await page.getByLabel("Location").selectOption("north-dc");
  await page.getByRole("button", { name: "Confirm receipt" }).click();

  await expect(page.getByRole("row", { name: /USB-C Dock.*50/ })).toBeVisible();
  await page.getByRole("button", { name: "Movement history" }).click();
  await expect(
    page.getByText("Receipt received", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("+8 each", { exact: true })).toBeVisible();
});

test("received stock persists at its selected facility after reload", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Receive stock", exact: true })
    .click();
  await page.getByLabel("Item").selectOption("dock-01");
  await page.getByLabel("Quantity").fill("5");
  await page.getByLabel("Location").selectOption("east-hub");
  await page.getByRole("button", { name: "Confirm receipt" }).click();

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

test("saved Bisaya inventory labels load in English without changing stock", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "stockroom-inventory-v1",
      JSON.stringify({
        items: [
          {
            id: "dock-01",
            sku: "DCK-100",
            name: "USB-C Dock",
            category: "Mga aksesorya sa kompyuter",
            unit: "piraso",
            reorderAt: 24,
            unitCost: 42.5,
            quantities: {
              "north-dc": 42,
              "east-hub": 28,
              "south-crossdock": 8,
            },
          },
        ],
        movements: [],
      }),
    );
  });

  await page.goto("/");

  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toContainText(
    "Computer accessories",
  );
  await expect(page.getByRole("row", { name: /USB-C Dock.*42/ })).toContainText(
    "each",
  );
});
