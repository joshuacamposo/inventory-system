import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  FilePlus2,
  Filter,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingDown,
  Warehouse,
  X,
} from "lucide-react";
import {
  addInventoryItem,
  loadInventory,
  locations,
  receiveStock,
  saveInventory,
  type InventoryItem,
  type InventoryState,
} from "./inventory";

type Page = "overview" | "inventory" | "movements";

const movementNames = {
  "Receipt received": "Receipt received",
  "Opening balance": "Opening balance",
  "Count adjustment": "Count adjustment",
} as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function App() {
  const [inventory, setInventory] = useState<InventoryState>(loadInventory);
  const [page, setPage] = useState<Page>("inventory");
  const [locationId, setLocationId] = useState("north-dc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<string | undefined>();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const currentLocation = locations.find(
    (location) => location.id === locationId,
  )!;
  const categories = useMemo(
    () => [
      "All categories",
      ...new Set(inventory.items.map((item) => item.category)),
    ],
    [inventory.items],
  );
  const filteredItems = useMemo(
    () =>
      inventory.items.filter((item) => {
        const matchesText = `${item.name} ${item.sku} ${item.category}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesCategory =
          category === "All categories" || item.category === category;
        const matchesStock =
          !lowStockOnly || (item.quantities[locationId] ?? 0) <= item.reorderAt;
        return matchesText && matchesCategory && matchesStock;
      }),
    [category, inventory.items, locationId, lowStockOnly, query],
  );
  const locationTotal = inventory.items.reduce(
    (total, item) => total + (item.quantities[locationId] ?? 0),
    0,
  );
  const lowStockCount = inventory.items.filter(
    (item) => (item.quantities[locationId] ?? 0) <= item.reorderAt,
  ).length;
  const stockValue = inventory.items.reduce(
    (total, item) => total + (item.quantities[locationId] ?? 0) * item.unitCost,
    0,
  );
  const recentMovements = [...inventory.movements]
    .filter((movement) => movement.locationId === locationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setInventory((current) =>
        receiveStock(
          current,
          String(form.get("itemId")),
          String(form.get("locationId")),
          Number(form.get("quantity")),
          String(form.get("reference")),
        ),
      );
      const itemName = inventory.items.find(
        (item) => item.id === String(form.get("itemId")),
      )?.name;
      setReceiveOpen(false);
      setNotice(`${itemName ?? "Stock"} received successfully`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not record receipt",
      );
    }
  }

  function openReceive(item?: InventoryItem) {
    setReceiveItemId(item?.id);
    setReceiveOpen(true);
  }

  function submitNewItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setInventory((current) =>
        addInventoryItem(current, {
          sku: String(form.get("sku")),
          name: String(form.get("name")),
          category: String(form.get("category")),
          unit: String(form.get("unit")),
          reorderAt: Number(form.get("reorderAt")),
          unitCost: Number(form.get("unitCost")),
        }),
      );
      setAddItemOpen(false);
      setNotice("Item added to inventory");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add item");
    }
  }

  function exportInventory() {
    const rows = [
      [
        "SKU",
        "Item",
        "Category",
        "Location",
        "Quantity",
        "Unit",
        "Reorder at",
        "Unit cost",
      ],
      ...inventory.items.map((item) => [
        item.sku,
        item.name,
        item.category,
        currentLocation.name,
        String(item.quantities[locationId] ?? 0),
        item.unit,
        String(item.reorderAt),
        item.unitCost.toFixed(2),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${locationId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#inventory"
          onClick={() => setPage("inventory")}
        >
          <span className="brand-mark">
            <Boxes size={19} strokeWidth={2.2} />
          </span>
          <span className="brand-name">
            stockroom<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">N</span>
          <span className="workspace-copy">
            <strong>Northstar Supply</strong>
            <small>Warehouse team</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">OPERATIONS</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={page === "overview" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("overview")}
            type="button"
          >
            <LayoutDashboard size={17} />
            <span>Overview</span>
          </button>
          <button
            className={page === "inventory" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("inventory")}
            type="button"
          >
            <Boxes size={17} />
            <span>Inventory</span>
            <span className="nav-count">{inventory.items.length}</span>
          </button>
          <button
            className={page === "movements" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("movements")}
            type="button"
          >
            <ArrowDownUp size={17} />
            <span>Movement history</span>
          </button>
        </nav>
        <div className="nav-label locations-heading">
          LOCATIONS{" "}
          <button
            aria-label="Add warehouse"
            className="icon-button quiet small"
            title="Add warehouse"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
        <nav className="location-nav" aria-label="Facility navigation">
          {locations.map((location) => (
            <button
              className={
                locationId === location.id
                  ? "location-item selected"
                  : "location-item"
              }
              key={location.id}
              onClick={() => setLocationId(location.id)}
              type="button"
            >
              <span className="location-dot" />
              {location.name}
              <span className="location-stock">
                {inventory.items.reduce(
                  (sum, item) => sum + (item.quantities[location.id] ?? 0),
                  0,
                )}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-status">
            <span className="status-dot" />
            <span>Saved on this device</span>
            <CircleHelp size={14} />
          </div>
          <button className="user-profile" type="button">
            <span className="user-avatar">JD</span>
            <span className="workspace-copy">
              <strong>Jordan Davis</strong>
              <small>Warehouse manager</small>
            </span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Warehouse</span>
            <span className="crumb-divider">/</span>
            <strong>
              {page === "movements"
                ? "Movement history"
                : page === "overview"
                  ? "Overview"
                  : "Inventory"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="sync-indicator">
              <span className="status-dot" />
              All changes saved
            </span>
            <button
              aria-label="Notifications"
              className="icon-button notification-button"
              title="Notifications"
              type="button"
            >
              <Bell size={18} />
              <i />
            </button>
            <span className="top-avatar">JD</span>
          </div>
        </header>

        <div className="page-container">
          <div className="page-heading-row">
            <div>
              <div className="eyebrow">
                <Warehouse size={14} /> WAREHOUSE OPERATIONS
              </div>
              <h1>
                {page === "movements"
                  ? "Movement history"
                  : page === "overview"
                    ? "Overview"
                    : "Inventory"}
              </h1>
              <p className="page-description">
                A clear picture of what’s on hand, where it is, and what
                changed.
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button button-secondary desktop-action"
                onClick={exportInventory}
                type="button"
              >
                <Download size={16} />
                Export
              </button>
              <button
                className="button button-secondary"
                onClick={() => setAddItemOpen(true)}
                type="button"
              >
                <FilePlus2 size={16} />
                Add item
              </button>
              <button
                className="button button-primary"
                onClick={() => setReceiveOpen(true)}
                type="button"
              >
                <ArrowDownToLine size={16} />
                Receive stock
              </button>
            </div>
          </div>

          <div className="context-bar">
            <div className="context-location">
              <span className="context-icon">
                <MapPin size={16} />
              </span>
              <div>
                <span className="context-label">CURRENT LOCATION</span>
                <strong>{currentLocation.name}</strong>
              </div>
              <span className="context-address">{currentLocation.address}</span>
            </div>
            <label className="location-select-wrap">
              <span className="sr-only">Current facility</span>
              <select
                aria-label="Current facility"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <span className="context-divider" />
            <span className="last-updated">
              <Clock3 size={14} />
              Updated just now
            </span>
          </div>

          <section aria-label="Inventory summary" className="metric-grid">
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">TOTAL UNITS ON HAND</span>
                <span className="metric-icon green">
                  <PackageCheck size={17} />
                </span>
              </div>
              <strong className="metric-value">
                {locationTotal.toLocaleString()}
              </strong>
              <span className="metric-foot">
                Across {inventory.items.length} active SKUs
              </span>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">ACTIVE ITEMS</span>
                <span className="metric-icon ink">
                  <Boxes size={17} />
                </span>
              </div>
              <strong className="metric-value">{inventory.items.length}</strong>
              <span className="metric-foot">
                {categories.length - 1} product categories
              </span>
            </article>
            <article className="metric-card metric-alert">
              <div className="metric-top">
                <span className="metric-label">AT OR BELOW REORDER</span>
                <span className="metric-icon amber">
                  <TrendingDown size={17} />
                </span>
              </div>
              <strong className="metric-value">{lowStockCount}</strong>
              <button
                className="metric-link"
                onClick={() => {
                  setPage("inventory");
                  setLowStockOnly(true);
                }}
                type="button"
              >
                Review low stock <ArrowRight size={13} />
              </button>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">STOCK VALUE</span>
                <span className="metric-icon coral">
                  <Activity size={17} />
                </span>
              </div>
              <strong className="metric-value">
                {money.format(stockValue)}
              </strong>
              <span className="metric-foot">At recorded unit cost</span>
            </article>
          </section>

          <div
            className={
              page === "movements"
                ? "content-grid single-panel"
                : "content-grid"
            }
          >
            <section className="inventory-panel panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {page === "movements"
                      ? "Recent movements"
                      : "Stock by item"}
                  </h2>
                  <p>
                    {page === "movements"
                      ? "Receipts and adjustments recorded at this location."
                      : "Quantities at the selected location."}
                  </p>
                </div>
                {page === "movements" ? (
                  <button
                    className="button button-secondary compact"
                    onClick={() => setPage("inventory")}
                    type="button"
                  >
                    Back to inventory
                  </button>
                ) : (
                  <button
                    aria-label="More inventory options"
                    className="icon-button quiet"
                    title="More inventory options"
                    type="button"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                )}
              </div>
              {page === "movements" ? (
                <MovementTable inventory={inventory} locationId={locationId} />
              ) : (
                <>
                  <div className="table-toolbar">
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search inventory"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by item or SKU"
                        value={query}
                      />
                      {query && (
                        <button
                          aria-label="Clear search"
                          onClick={() => setQuery("")}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                    <label className="category-select">
                      <Filter size={15} />
                      <select
                        aria-label="Category"
                        onChange={(event) => setCategory(event.target.value)}
                        value={category}
                      >
                        {categories.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                    <button
                      className={
                        lowStockOnly
                          ? "filter-button selected"
                          : "filter-button"
                      }
                      onClick={() => setLowStockOnly((current) => !current)}
                      type="button"
                    >
                      <SlidersHorizontal size={15} />
                      {lowStockOnly ? "Low stock only" : "Filters"}
                      {lowStockOnly && <X size={13} />}
                    </button>
                  </div>
                  <InventoryTable
                    items={filteredItems}
                    locationId={locationId}
                    onReceive={openReceive}
                  />
                  <div className="table-footer">
                    <span>
                      Showing <strong>{filteredItems.length}</strong> of{" "}
                      <strong>{inventory.items.length}</strong> items
                    </span>
                    <span className="table-footer-right">
                      Counts shown in item’s stocking unit
                    </span>
                  </div>
                </>
              )}
            </section>

            {page !== "movements" && (
              <aside className="activity-panel panel">
                <div className="panel-heading activity-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Latest stock changes</p>
                  </div>
                  <button
                    aria-label="Open all activity"
                    className="icon-button quiet"
                    onClick={() => setPage("movements")}
                    title="Open all activity"
                    type="button"
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="activity-list">
                  {recentMovements.slice(0, 4).map((movement) => {
                    const item = inventory.items.find(
                      (candidate) => candidate.id === movement.itemId,
                    );
                    return (
                      <div className="activity-entry" key={movement.id}>
                        <span
                          className={
                            movement.kind === "Receipt received"
                              ? "activity-symbol receipt"
                              : "activity-symbol"
                          }
                        >
                          <ArrowDownToLine size={15} />
                        </span>
                        <div className="activity-copy">
                          <strong>{movementNames[movement.kind]}</strong>
                          <span>
                            {item?.name ?? "Inventory item"} ·{" "}
                            {movement.reference}
                          </span>
                          <time>
                            {dateTime.format(new Date(movement.createdAt))}
                          </time>
                        </div>
                        <span className="activity-quantity">
                          +{movement.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="activity-link"
                  onClick={() => setPage("movements")}
                  type="button"
                >
                  View all activity <ArrowRight size={14} />
                </button>
                <div className="location-card">
                  <div className="location-card-top">
                    <span className="location-card-icon">
                      <Warehouse size={17} />
                    </span>
                    <span className="location-card-status">
                      <span className="status-dot" />
                      Operational
                    </span>
                  </div>
                  <strong>{currentLocation.name}</strong>
                  <span>{currentLocation.address}</span>
                  <div className="location-card-foot">
                    <span>
                      <MapPin size={13} />
                      {currentLocation.binCount} storage bins
                    </span>
                    <button
                      aria-label="View facility details"
                      title="View facility details"
                      type="button"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
          <footer className="page-footer">
            <span>
              Stockroom <span className="footer-dot">·</span> Inventory
              workspace
            </span>
            <span>
              Local demo data <span className="footer-dot">·</span> Stored in
              this browser
            </span>
          </footer>
        </div>
      </main>

      {receiveOpen && (
        <ReceiveDialog
          items={inventory.items}
          currentLocationId={locationId}
          initialItemId={receiveItemId}
          onClose={() => setReceiveOpen(false)}
          onSubmit={submitReceipt}
        />
      )}
      {addItemOpen && (
        <AddItemDialog
          onClose={() => setAddItemOpen(false)}
          onSubmit={submitNewItem}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {notice}
          <button
            aria-label="Isira ang pahibalo"
            onClick={() => setNotice("")}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryTable({
  items,
  locationId,
  onReceive,
}: {
  items: InventoryItem[];
  locationId: string;
  onReceive: (item: InventoryItem) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ITEM</th>
            <th>CATEGORY</th>
            <th>ON HAND</th>
            <th>REORDER AT</th>
            <th>STATUS</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const quantity = item.quantities[locationId] ?? 0;
            const low = quantity <= item.reorderAt;
            return (
              <tr key={item.id}>
                <td>
                  <div className="item-cell">
                    <span
                      className={`item-thumbnail tone-${item.category === "Warehouse equipment" ? "orange" : item.category === "Packing supplies" ? "purple" : "green"}`}
                    >
                      <PackageCheck size={18} />
                    </span>
                    <span className="item-details">
                      <strong>{item.name}</strong>
                      <small>{item.sku}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="category-value">{item.category}</span>
                </td>
                <td>
                  <strong className="quantity-value">
                    {quantity.toLocaleString()}
                  </strong>
                  <span className="unit-label"> {item.unit}</span>
                </td>
                <td>
                  <span className="reorder-value">
                    {item.reorderAt} {item.unit}
                  </span>
                </td>
                <td>
                  <span
                    className={low ? "stock-pill low" : "stock-pill healthy"}
                  >
                    <span />
                    {low ? "Reorder" : "In stock"}
                  </span>
                </td>
                <td>
                  <button
                    aria-label={`Receive ${item.name}`}
                    className="row-action"
                    onClick={() => onReceive(item)}
                    title={`Receive ${item.name}`}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td className="empty-cell" colSpan={6}>
                <span>
                  <Search size={20} />
                </span>
                <strong>No matching inventory</strong>
                <small>Try a different search or clear your filters.</small>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MovementTable({
  inventory,
  locationId,
}: {
  inventory: InventoryState;
  locationId: string;
}) {
  const movements = inventory.movements
    .filter((movement) => movement.locationId === locationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return (
    <div className="movement-list">
      {movements.map((movement) => {
        const item = inventory.items.find(
          (candidate) => candidate.id === movement.itemId,
        );
        return (
          <article className="movement-row" key={movement.id}>
            <span className="activity-symbol receipt">
              <ArrowDownToLine size={15} />
            </span>
            <div className="movement-main">
              <strong>{movementNames[movement.kind]}</strong>
              <span>
                {item?.name} · {movement.reference}
              </span>
              <time>{dateTime.format(new Date(movement.createdAt))}</time>
            </div>
            <strong className="movement-quantity">
              +{movement.quantity} {item?.unit}
            </strong>
          </article>
        );
      })}
    </div>
  );
}

function ReceiveDialog({
  items,
  currentLocationId,
  initialItemId,
  onClose,
  onSubmit,
}: {
  items: InventoryItem[];
  currentLocationId: string;
  initialItemId?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState(
    initialItemId ?? items[0]?.id ?? "",
  );
  const selectedItem = items.find((item) => item.id === selectedItemId);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="receive-title"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <span className="dialog-icon receive-icon">
              <ArrowDownToLine size={18} />
            </span>
            <h2 id="receive-title">Receive stock</h2>
            <p>Add incoming quantities to a warehouse location.</p>
          </div>
          <button
            aria-label="Close"
            className="icon-button quiet"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <label className="form-field">
            <span>Item</span>
            <select
              name="itemId"
              onChange={(event) => setSelectedItemId(event.target.value)}
              required
              value={selectedItemId}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.sku}
                </option>
              ))}
            </select>
          </label>
          {selectedItem && (
            <div className="form-context">
              Current stock at selected location{" "}
              <strong>
                {selectedItem.quantities[currentLocationId] ?? 0}{" "}
                {selectedItem.unit}
              </strong>
            </div>
          )}
          <div className="form-row">
            <label className="form-field">
              <span>Quantity</span>
              <div className="input-with-unit">
                <input
                  autoFocus
                  min="1"
                  name="quantity"
                  placeholder="0"
                  required
                  step="1"
                  type="number"
                />
                <span>{selectedItem?.unit ?? "each"}</span>
              </div>
            </label>
            <label className="form-field">
              <span>Location</span>
              <select
                defaultValue={currentLocationId}
                name="locationId"
                required
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field">
            <span>
              Reference <small>Optional</small>
            </span>
            <input name="reference" placeholder="e.g. PO-10482" />
          </label>
          <div className="movement-preview">
            <span className="preview-icon">
              <ArrowDownToLine size={15} />
            </span>
            <span>Receipt will be added to the stock movement history.</span>
          </div>
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit">
              <Check size={16} />
              Confirm receipt
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AddItemDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="add-item-title"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <span className="dialog-icon add-icon">
              <FilePlus2 size={18} />
            </span>
            <h2 id="add-item-title">Add inventory item</h2>
            <p>Create an item record for your warehouse.</p>
          </div>
          <button
            aria-label="Close"
            className="icon-button quiet"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label className="form-field">
              <span>Item name</span>
              <input
                autoFocus
                name="name"
                placeholder="e.g. Packing tape"
                required
              />
            </label>
            <label className="form-field">
              <span>SKU</span>
              <input name="sku" placeholder="pananglitan: PAK-205" required />
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span>Category</span>
              <input
                name="category"
                placeholder="e.g. Packing supplies"
                required
              />
            </label>
            <label className="form-field">
              <span>Stocking unit</span>
              <select defaultValue="each" name="unit">
                <option value="each">Each</option>
                <option value="box">Box</option>
                <option value="case">Case</option>
                <option value="roll">Roll</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span>Reorder at</span>
              <input
                defaultValue="10"
                min="0"
                name="reorderAt"
                required
                type="number"
              />
            </label>
            <label className="form-field">
              <span>Unit cost</span>
              <div className="input-with-unit">
                <span className="prefix-unit">₱</span>
                <input
                  defaultValue="0"
                  min="0"
                  name="unitCost"
                  required
                  step="0.01"
                  type="number"
                />
              </div>
            </label>
          </div>
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit">
              <Plus size={16} />
              Add item
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default App;
