# 12: Pick and Dispatch Stock

**What to build:** Staff commit available stock to outbound work, pick it from its location, and dispatch it without double-promising or miscounting inventory.

**Blocked by:** 09: Receive Stock and Find It by Location; 04: Define Stock Availability, Holds, and Reservations; 06: Define Staff Roles, Permissions, and Audit Controls.

**Status:** ready-for-agent

- [ ] An authorized user can commit eligible stock to outbound work using the agreed reservation or allocation rules.
- [ ] A picker can identify and record the stock selected from the agreed locations.
- [ ] Dispatch updates inventory availability and on-hand quantities according to the agreed workflow and records attributable movements.
- [ ] The end-to-end acceptance test verifies that committed stock cannot be promised twice and that dispatch produces the correct persisted inventory outcome.
