# Workflow Detail Page Live Status Polling Fix

## Problem
The workflow detail page was experiencing full page reloads/flashing during live status polling because:
1. The polling mechanism was refetching the entire `GetWorkflowDetailQuery` every 1.5 seconds
2. This caused the entire page to briefly show a loading state and reset UI components
3. After workflow completion, new runs only appeared after manual page refresh

## Solution
Implemented a scoped polling approach that:
1. Uses a narrow GraphQL query (`GetWorkflowLiveStatusQuery`) that only fetches the latest workflow run
2. Separates initial page load (shows loading screen) from background polling (no loading screen)
3. Maintains UI stability during polling by only updating relevant data
4. Automatically displays new completed runs without manual refresh
5. Prevents duplicate polling intervals
6. Cleans up polling intervals properly

## Key Changes Made

### 1. Created Scoped Query (`graphql/queries/workflow-live-status.ts`)
```graphql
query GetWorkflowLiveStatus($workflowId: uuid!) {
  workflow_runs(
    where: { workflow_id: { _eq: $workflowId } }
    order_by: { started_at: desc }
    limit: 1
  ) {
    id
    status
    started_at
    completed_at
    step_runs(order_by: { workflow_step: { position: asc } }) {
      id
      status
      attempt_count
      input
      output
      error
      workflow_step {
        id
        name
        type
        position
      }
    }
  }
}
```

### 2. Replaced Problematic Polling Logic
**Before**: Used `useEffect` with `reexecute({ requestPolicy: 'network-only' })` on the full workflow detail query, causing full page reloads.

**After**: Implemented multiple focused `useEffect` hooks:
- Live status query result handler
- Polling interval setup/cleanup (using scoped query)
- Active run change handler (immediate reexecute when active run changes)
- Workflow run synchronization (keep live data in sync with main query)
- Edit field initialization

### 3. Status Handling Improvements
- Fixed `isLiveRunStatus` to properly check for running/paused states
- Removed incorrect `waiting_for_approval` status (UI shows "WAITING APPROVAL" for paused status)
- Corrected `activePollingRunId` calculation to handle null values properly
- Used proper React event types (`React.FormEvent<HTMLFormElement>`) to fix deprecation warnings

### 4. UI Stability Enhancements
- Changed loading condition to `isInitialLoading = fetching && !workflow` 
  - Only shows full-page loader during initial data fetch
  - Background polls use existing data without showing loading states
- Maintained all existing UI components (builder, execution history, approval controls) during polling
- Approve & Resume button remains stable (no disappearance/reappearance during polling)

## Verification
- � ✅ TypeScript compilation: `npx tsc --noEmit` passes
- � ✅ Production build: `npm run build` succeeds
- � ✅ All existing functionality preserved:
  - Manual workflow triggering
  - Webhook triggering
  - LLM, HTTP, conditional branch, DB write, notify, approval gate steps
  - Approval and resume functionality
  - Execution history tracking
  - Role-based access control
- � ✅ No changes to:
  - Hasura schema
  - Permissions
  - Webhook/Action handlers
  - Execution engine
  - Database schema

## UX Behavior
1. **Initial Page Load**: Shows loading screen until workflow data loads
2. **During Workflow Execution**: 
   - Page remains fully visible and interactive
   - Status updates silently in background
   - No visual flashing or reloads
   - Builder and controls remain usable
3. **At Approval Gate** ("WAITING FOR APPROVAL"):
   - Page stays stable
   - Approve & Resume button consistently visible
   - Clicking approval works without UI disruption
4. **After Completion**:
   - New completed run appears automatically in execution history
   - No manual refresh required
5. **Polling Lifecycle**:
   - Starts when run enters running/paused state
   - Stops when run reaches terminal state (completed/failed/cancelled)
   - Only one active polling interval at any time
   - Properly cleaned up on component unmount

This fix resolves the flashing/reloading issue while maintaining all required live status update functionality.