# 16: Return Stock to Inventory with a Recorded Disposition

**What to build:** Staff record returns, assess their disposition, and place eligible quantities into an appropriate location with full movement history.

**Blocked by:** 01: Define Core Warehouse Workflows and MVP Scope; 02: Define Item Identity, Barcodes, and Stocking Units; 03: Define the Warehouse and Bin Location Model; 04: Define Stock Availability, Holds, and Reservations; 06: Define Staff Roles, Permissions, and Audit Controls; 09: Receive Stock and Find It by Location.

**Status:** ready-for-agent

- [ ] An authorized user can record returned quantities using the agreed item identity and return workflow.
- [ ] A user can record the agreed disposition and distinguish stock eligible for use from stock that must remain unavailable.
- [ ] Eligible quantities are placed into an allowed location and all resulting movements are attributable and traceable.
- [ ] The end-to-end acceptance test verifies return disposition and resulting persisted inventory through the user-facing application.
