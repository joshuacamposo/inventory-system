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
  "Receipt received": "Pagdawat sa stock",
  "Opening balance": "Pasiunang balanse sa stock",
  "Count adjustment": "Koreksiyon sa ihap",
} as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const bisayaMonths = [
  "Enero",
  "Pebrero",
  "Marso",
  "Abril",
  "Mayo",
  "Hunyo",
  "Hulyo",
  "Agosto",
  "Setyembre",
  "Oktubre",
  "Nobyembre",
  "Disyembre",
];

function formatBisayaDateTime(date: Date): string {
  const hour = date.getHours();
  const hour12 = hour % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  const dayPeriod =
    hour < 12 ? "sa buntag" : hour < 18 ? "sa hapon" : "sa gabii";
  return `${date.getDate()} ${bisayaMonths[date.getMonth()]}, ${hour12}:${minute} ${dayPeriod}`;
}

function App() {
  const [inventory, setInventory] = useState<InventoryState>(loadInventory);
  const [page, setPage] = useState<Page>("inventory");
  const [locationId, setLocationId] = useState("north-dc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tanang kategorya");
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
      "Tanang kategorya",
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
          category === "Tanang kategorya" || item.category === category;
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
      setNotice(`Malampusong nadawat ang stock sa ${itemName ?? "butang"}`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Wala marekord ang pagdawat sa stock",
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
      setNotice("Naidugang na ang butang sa imbentaryo");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Wala maidugang ang butang",
      );
    }
  }

  function exportInventory() {
    const rows = [
      [
        "SKU",
        "Butang",
        "Kategorya",
        "Lokasyon",
        "Kadaghanon",
        "Yunit",
        "Limit sa pag-order",
        "Gasto kada yunit",
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
    link.download = `imbentaryo-${locationId}.csv`;
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
        <div className="workspace-label">LUGAR SA TRABAHO</div>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">N</span>
          <span className="workspace-copy">
            <strong>Northstar Supply</strong>
            <small>Grupo sa bodega</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">MGA BULUHATON</div>
        <nav className="main-nav" aria-label="Pangunang nabigasyon">
          <button
            className={page === "overview" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("overview")}
            type="button"
          >
            <LayoutDashboard size={17} />
            <span>Kinatibuk-ang tan-aw</span>
          </button>
          <button
            className={page === "inventory" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("inventory")}
            type="button"
          >
            <Boxes size={17} />
            <span>Imbentaryo</span>
            <span className="nav-count">{inventory.items.length}</span>
          </button>
          <button
            className={page === "movements" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("movements")}
            type="button"
          >
            <ArrowDownUp size={17} />
            <span>Kasaysayan sa stock</span>
          </button>
        </nav>
        <div className="nav-label locations-heading">
          MGA LOKASYON{" "}
          <button
            aria-label="Idugang og bodega"
            className="icon-button quiet small"
            title="Idugang og bodega"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
        <nav className="location-nav" aria-label="Pag-navigate sa mga bodega">
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
            <span>Gitipigan niining device</span>
            <CircleHelp size={14} />
          </div>
          <button className="user-profile" type="button">
            <span className="user-avatar">JD</span>
            <span className="workspace-copy">
              <strong>Jordan Davis</strong>
              <small>Tagdumala sa bodega</small>
            </span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Bodega</span>
            <span className="crumb-divider">/</span>
            <strong>
              {page === "movements"
                ? "Kasaysayan sa stock"
                : page === "overview"
                  ? "Kinatibuk-ang tan-aw"
                  : "Imbentaryo"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="sync-indicator">
              <span className="status-dot" />
              Gitipigan na ang tanang kausaban
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
                <Warehouse size={14} /> MGA BULUHATON SA BODEGA
              </div>
              <h1>
                {page === "movements"
                  ? "Kasaysayan sa stock"
                  : page === "overview"
                    ? "Kinatibuk-ang tan-aw"
                    : "Imbentaryo"}
              </h1>
              <p className="page-description">
                Hibaloa unsay naa, asa kini nahimutang, ug unsay nausab.
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button button-secondary desktop-action"
                onClick={exportInventory}
                type="button"
              >
                <Download size={16} />
                I-export
              </button>
              <button
                className="button button-secondary"
                onClick={() => setAddItemOpen(true)}
                type="button"
              >
                <FilePlus2 size={16} />
                Idugang og butang
              </button>
              <button
                className="button button-primary"
                onClick={() => setReceiveOpen(true)}
                type="button"
              >
                <ArrowDownToLine size={16} />
                Dawata ang stock
              </button>
            </div>
          </div>

          <div className="context-bar">
            <div className="context-location">
              <span className="context-icon">
                <MapPin size={16} />
              </span>
              <div>
                <span className="context-label">KASAMTANG LOKASYON</span>
                <strong>{currentLocation.name}</strong>
              </div>
              <span className="context-address">{currentLocation.address}</span>
            </div>
            <label className="location-select-wrap">
              <span className="sr-only">Kasamtang nga bodega</span>
              <select
                aria-label="Kasamtang nga bodega"
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
              Bag-o lang gi-update
            </span>
          </div>

          <section
            aria-label="Kinatibuk-ang kahimtang sa imbentaryo"
            className="metric-grid"
          >
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">KATIBUK-ANG STOCK NGA NAA</span>
                <span className="metric-icon green">
                  <PackageCheck size={17} />
                </span>
              </div>
              <strong className="metric-value">
                {locationTotal.toLocaleString()}
              </strong>
              <span className="metric-foot">
                Sa {inventory.items.length} ka aktibong SKU
              </span>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">MGA AKTIBONG BUTANG</span>
                <span className="metric-icon ink">
                  <Boxes size={17} />
                </span>
              </div>
              <strong className="metric-value">{inventory.items.length}</strong>
              <span className="metric-foot">
                {categories.length - 1} ka kategorya sa produkto
              </span>
            </article>
            <article className="metric-card metric-alert">
              <div className="metric-top">
                <span className="metric-label">
                  UBOS NA SA LIMIT SA PAG-ORDER
                </span>
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
                Tan-awa ang ubos nga stock <ArrowRight size={13} />
              </button>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-label">BILI SA STOCK</span>
                <span className="metric-icon coral">
                  <Activity size={17} />
                </span>
              </div>
              <strong className="metric-value">
                {money.format(stockValue)}
              </strong>
              <span className="metric-foot">
                Base sa natala nga gasto kada yunit
              </span>
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
                      ? "Bag-ong mga lihok"
                      : "Stock matag butang"}
                  </h2>
                  <p>
                    {page === "movements"
                      ? "Mga nadawat ug giusab nga natala niining lokasyon."
                      : "Kadaghanon sa napiling lokasyon."}
                  </p>
                </div>
                {page === "movements" ? (
                  <button
                    className="button button-secondary compact"
                    onClick={() => setPage("inventory")}
                    type="button"
                  >
                    Balik sa imbentaryo
                  </button>
                ) : (
                  <button
                    aria-label="Uban pang opsyon sa imbentaryo"
                    className="icon-button quiet"
                    title="Uban pang opsyon sa imbentaryo"
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
                        aria-label="Pangitaa sa imbentaryo"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Pangitaa ang butang o SKU"
                        value={query}
                      />
                      {query && (
                        <button
                          aria-label="Tangtanga ang pangita"
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
                        aria-label="Kategorya"
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
                      {lowStockOnly ? "Ubos nga stock ra" : "Mga filter"}
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
                      Gipakita ang <strong>{filteredItems.length}</strong> sa{" "}
                      <strong>{inventory.items.length}</strong> ka butang
                    </span>
                    <span className="table-footer-right">
                      Gipakita ang ihap sa yunit sa butang
                    </span>
                  </div>
                </>
              )}
            </section>

            {page !== "movements" && (
              <aside className="activity-panel panel">
                <div className="panel-heading activity-heading">
                  <div>
                    <h2>Bag-ong kalihokan</h2>
                    <p>Pinakabag-ong kausaban sa stock</p>
                  </div>
                  <button
                    aria-label="Ablihi tanang kalihokan"
                    className="icon-button quiet"
                    onClick={() => setPage("movements")}
                    title="Ablihi tanang kalihokan"
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
                            {item?.name ?? "Butang sa imbentaryo"} ·{" "}
                            {movement.reference}
                          </span>
                          <time>
                            {formatBisayaDateTime(new Date(movement.createdAt))}
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
                  Tan-awa tanang kalihokan <ArrowRight size={14} />
                </button>
                <div className="location-card">
                  <div className="location-card-top">
                    <span className="location-card-icon">
                      <Warehouse size={17} />
                    </span>
                    <span className="location-card-status">
                      <span className="status-dot" />
                      Naglihok
                    </span>
                  </div>
                  <strong>{currentLocation.name}</strong>
                  <span>{currentLocation.address}</span>
                  <div className="location-card-foot">
                    <span>
                      <MapPin size={13} />
                      {currentLocation.binCount} ka puwesto sa pagtipig
                    </span>
                    <button
                      aria-label="Tan-awa ang detalye sa bodega"
                      title="Tan-awa ang detalye sa bodega"
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
              Stockroom <span className="footer-dot">·</span> Lugar sa
              imbentaryo
            </span>
            <span>
              Lokal nga datos pananglitan <span className="footer-dot">·</span>{" "}
              Gitipigan niining browser
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
            <th>BUTANG</th>
            <th>KATEGORYA</th>
            <th>NAA KARON</th>
            <th>LIMIT SA PAG-ORDER</th>
            <th>KAHIMTANG</th>
            <th aria-label="Mga aksyon" />
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
                      className={`item-thumbnail tone-${item.category === "Mga ekipo sa bodega" ? "orange" : item.category === "Mga gamit sa pagputos" ? "purple" : "green"}`}
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
                    {low ? "Kinahanglan i-order" : "Anaa sa stock"}
                  </span>
                </td>
                <td>
                  <button
                    aria-label={`Dawata ang stock: ${item.name}`}
                    className="row-action"
                    onClick={() => onReceive(item)}
                    title={`Dawata ang stock: ${item.name}`}
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
                <strong>Walay katugbang nga imbentaryo</strong>
                <small>
                  Sulayi ang laing pangita o tangtanga ang mga filter.
                </small>
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
              <time>{formatBisayaDateTime(new Date(movement.createdAt))}</time>
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
            <h2 id="receive-title">Dawata ang stock</h2>
            <p>Irekord ang gidawat nga gidaghanon sa lokasyon sa bodega.</p>
          </div>
          <button
            aria-label="Sirad-i"
            className="icon-button quiet"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <label className="form-field">
            <span>Butang</span>
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
              Stock karon sa napiling lokasyon{" "}
              <strong>
                {selectedItem.quantities[currentLocationId] ?? 0}{" "}
                {selectedItem.unit}
              </strong>
            </div>
          )}
          <div className="form-row">
            <label className="form-field">
              <span>Kadaghanon</span>
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
                <span>{selectedItem?.unit ?? "piraso"}</span>
              </div>
            </label>
            <label className="form-field">
              <span>Lokasyon</span>
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
              Reperensiya <small>Dili kinahanglan</small>
            </span>
            <input name="reference" placeholder="pananglitan: PO-10482" />
          </label>
          <div className="movement-preview">
            <span className="preview-icon">
              <ArrowDownToLine size={15} />
            </span>
            <span>
              Idugang kining pagdawat sa kasaysayan sa lihok sa stock.
            </span>
          </div>
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              onClick={onClose}
              type="button"
            >
              Kanselahon
            </button>
            <button className="button button-primary" type="submit">
              <Check size={16} />
              Kumpirmaha ang pagdawat
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
            <h2 id="add-item-title">Idugang og butang sa imbentaryo</h2>
            <p>Maghimo og rekord sa butang para sa imong bodega.</p>
          </div>
          <button
            aria-label="Sirad-i"
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
              <span>Ngalan sa butang</span>
              <input
                autoFocus
                name="name"
                placeholder="pananglitan: Packing tape"
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
              <span>Kategorya</span>
              <input
                name="category"
                placeholder="pananglitan: Mga gamit sa pagputos"
                required
              />
            </label>
            <label className="form-field">
              <span>Yunit sa stock</span>
              <select defaultValue="piraso" name="unit">
                <option value="piraso">Piraso</option>
                <option value="kahon">Kahon</option>
                <option value="kaso">Kaso</option>
                <option value="rolyo">Rolyo</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span>Limit sa pag-order</span>
              <input
                defaultValue="10"
                min="0"
                name="reorderAt"
                required
                type="number"
              />
            </label>
            <label className="form-field">
              <span>Gasto kada yunit</span>
              <div className="input-with-unit">
                <span className="prefix-unit">$</span>
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
              Kanselahon
            </button>
            <button className="button button-primary" type="submit">
              <Plus size={16} />
              Idugang
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default App;
