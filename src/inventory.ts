export type WarehouseLocation = {
  id: string;
  name: string;
  address: string;
  binCount: number;
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorderAt: number;
  unitCost: number;
  quantities: Record<string, number>;
};

export type StockMovement = {
  id: string;
  itemId: string;
  locationId: string;
  kind: "Receipt received" | "Opening balance" | "Count adjustment";
  quantity: number;
  reference: string;
  createdAt: string;
};

export type InventoryState = {
  items: InventoryItem[];
  movements: StockMovement[];
};

export const locations: WarehouseLocation[] = [
  { id: "north-dc", name: "North DC", address: "Portland, OR", binCount: 48 },
  { id: "east-hub", name: "East Hub", address: "Columbus, OH", binCount: 32 },
  {
    id: "south-crossdock",
    name: "South Crossdock",
    address: "Austin, TX",
    binCount: 18,
  },
];

const initialItems: InventoryItem[] = [
  {
    id: "dock-01",
    sku: "DCK-100",
    name: "USB-C Dock",
    category: "Mga aksesorya sa kompyuter",
    unit: "piraso",
    reorderAt: 24,
    unitCost: 42.5,
    quantities: { "north-dc": 42, "east-hub": 28, "south-crossdock": 8 },
  },
  {
    id: "scanner-02",
    sku: "SCN-220",
    name: "Wireless Scanner",
    category: "Mga ekipo sa bodega",
    unit: "piraso",
    reorderAt: 12,
    unitCost: 86,
    quantities: { "north-dc": 16, "east-hub": 9, "south-crossdock": 0 },
  },
  {
    id: "cable-03",
    sku: "CBL-014",
    name: "USB-C Cable, 1 m",
    category: "Mga aksesorya sa kompyuter",
    unit: "piraso",
    reorderAt: 40,
    unitCost: 4.25,
    quantities: { "north-dc": 118, "east-hub": 72, "south-crossdock": 34 },
  },
  {
    id: "label-04",
    sku: "LBL-400",
    name: "Thermal Labels, 4 x 6",
    category: "Mga gamit sa pagputos",
    unit: "rolyo",
    reorderAt: 20,
    unitCost: 7.8,
    quantities: { "north-dc": 18, "east-hub": 24, "south-crossdock": 10 },
  },
  {
    id: "scanner-batt-05",
    sku: "BAT-018",
    name: "Scanner Battery Pack",
    category: "Mga ekipo sa bodega",
    unit: "piraso",
    reorderAt: 10,
    unitCost: 19.4,
    quantities: { "north-dc": 31, "east-hub": 13, "south-crossdock": 7 },
  },
];

const storageKey = "stockroom-inventory-v1";
const savedCategoryTranslations: Record<string, string> = {
  "Computer accessories": "Mga aksesorya sa kompyuter",
  "Warehouse equipment": "Mga ekipo sa bodega",
  "Packing supplies": "Mga gamit sa pagputos",
};
const savedUnitTranslations: Record<string, string> = {
  each: "piraso",
  box: "kahon",
  case: "kaso",
  roll: "rolyo",
};
const savedReferenceTranslations: Record<string, string> = {
  "Initial inventory": "Imbentaryo sa sinugdanan",
  "Manual receipt": "Manwal nga pagdawat",
};

function makeOpeningMovements(): StockMovement[] {
  return initialItems.flatMap((item) =>
    locations.flatMap((location) => {
      const quantity = item.quantities[location.id] ?? 0;
      if (!quantity) return [];
      return [
        {
          id: `opening-${item.id}-${location.id}`,
          itemId: item.id,
          locationId: location.id,
          kind: "Opening balance" as const,
          quantity,
          reference: "Imbentaryo sa sinugdanan",
          createdAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        },
      ];
    }),
  );
}

export function createInitialInventory(): InventoryState {
  return { items: initialItems, movements: makeOpeningMovements() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInventoryState(value: unknown): value is InventoryState {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.movements)
  ) {
    return false;
  }

  const itemIds = new Set<string>();
  const validItems = value.items.every((item) => {
    if (!isRecord(item)) return false;
    if (
      typeof item.id !== "string" ||
      typeof item.sku !== "string" ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      typeof item.unit !== "string" ||
      typeof item.reorderAt !== "number" ||
      !Number.isSafeInteger(item.reorderAt) ||
      item.reorderAt < 0 ||
      typeof item.unitCost !== "number" ||
      !Number.isFinite(item.unitCost) ||
      item.unitCost < 0 ||
      !isRecord(item.quantities) ||
      !item.id ||
      itemIds.has(item.id)
    ) {
      return false;
    }

    const validQuantities = Object.entries(item.quantities).every(
      ([locationId, quantity]) =>
        locations.some((location) => location.id === locationId) &&
        typeof quantity === "number" &&
        Number.isSafeInteger(quantity) &&
        quantity >= 0,
    );
    if (!validQuantities) return false;

    itemIds.add(item.id);
    return true;
  });
  if (!validItems) return false;

  return value.movements.every((movement) => {
    if (!isRecord(movement)) return false;
    return (
      typeof movement.id === "string" &&
      typeof movement.itemId === "string" &&
      itemIds.has(movement.itemId) &&
      typeof movement.locationId === "string" &&
      locations.some((location) => location.id === movement.locationId) &&
      (movement.kind === "Receipt received" ||
        movement.kind === "Opening balance" ||
        movement.kind === "Count adjustment") &&
      typeof movement.quantity === "number" &&
      Number.isSafeInteger(movement.quantity) &&
      movement.quantity > 0 &&
      typeof movement.reference === "string" &&
      typeof movement.createdAt === "string" &&
      Number.isFinite(Date.parse(movement.createdAt))
    );
  });
}

export function loadInventory(): InventoryState {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return createInitialInventory();
    const parsed: unknown = JSON.parse(stored);
    if (isInventoryState(parsed)) {
      return {
        ...parsed,
        items: parsed.items.map((item) => ({
          ...item,
          category: savedCategoryTranslations[item.category] ?? item.category,
          unit: savedUnitTranslations[item.unit] ?? item.unit,
        })),
        movements: parsed.movements.map((movement) => ({
          ...movement,
          reference:
            savedReferenceTranslations[movement.reference] ??
            movement.reference,
        })),
      };
    }
  } catch {
    return createInitialInventory();
  }
  return createInitialInventory();
}

export function saveInventory(state: InventoryState): void {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function receiveStock(
  state: InventoryState,
  itemId: string,
  locationId: string,
  quantity: number,
  reference: string,
): InventoryState {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Pagsulod og tibuok nga gidaghanon nga labaw sa sero.");
  }

  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Pilia ang butang sa imbentaryo.");
  if (!locations.some((location) => location.id === locationId)) {
    throw new Error("Pilia ang lokasyon sa bodega.");
  }

  return {
    items: state.items.map((candidate) =>
      candidate.id === itemId
        ? {
            ...candidate,
            quantities: {
              ...candidate.quantities,
              [locationId]: (candidate.quantities[locationId] ?? 0) + quantity,
            },
          }
        : candidate,
    ),
    movements: [
      {
        id: crypto.randomUUID(),
        itemId,
        locationId,
        kind: "Receipt received",
        quantity,
        reference: reference.trim() || "Manwal nga pagdawat",
        createdAt: new Date().toISOString(),
      },
      ...state.movements,
    ],
  };
}

export function addInventoryItem(
  state: InventoryState,
  input: Pick<
    InventoryItem,
    "sku" | "name" | "category" | "unit" | "reorderAt" | "unitCost"
  >,
): InventoryState {
  const sku = input.sku.trim().toUpperCase();
  const name = input.name.trim();
  if (!sku || !name)
    throw new Error("Kinahanglan ang SKU ug ngalan sa butang.");
  if (
    state.items.some((item) => item.sku.toLowerCase() === sku.toLowerCase())
  ) {
    throw new Error("Gigamit na kana nga SKU.");
  }
  const item: InventoryItem = {
    ...input,
    id: crypto.randomUUID(),
    sku,
    name,
    quantities: Object.fromEntries(
      locations.map((location) => [location.id, 0]),
    ),
  };
  return { ...state, items: [item, ...state.items] };
}
