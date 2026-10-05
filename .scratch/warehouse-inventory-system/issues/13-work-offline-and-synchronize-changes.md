# 13: Work Offline and Safely Synchronize Inventory Changes

**What to build:** Staff can complete the agreed offline-capable inventory workflows, see pending synchronization, and have changes reconciled on reconnect using the decided conflict rules.

**Blocked by:** 05: Define Offline Operations and Synchronization Rules; 09: Receive Stock and Find It by Location; and whichever of 10: Count Stock and Resolve Discrepancies, 11: Transfer Stock Between Locations, and 12: Pick and Dispatch Stock are designated offline-capable by 01: Define Core Warehouse Workflows and MVP Scope.

**Status:** ready-for-agent

- [ ] A user can perform each workflow explicitly designated for offline use without network access.
- [ ] The application makes pending, synchronized, and conflicted work distinguishable to the user.
- [ ] On reconnection, offline changes are applied or surfaced for resolution according to the agreed synchronization and conflict rules, without silent loss or duplication.
- [ ] The end-to-end acceptance test verifies offline work and synchronization through the user-facing application, including the decided concurrent-update scenarios.
