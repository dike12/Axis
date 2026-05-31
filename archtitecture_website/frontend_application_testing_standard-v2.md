# Frontend Application Technical Specification & E2E Testing Standard

This technical specification documentation outlines the architecture, data structures, state dependencies, and core functional logic of the React-based Financial Management Frontend Application. It serves as an engineering blueprint for implementing automated Testing Suites across Unit, Integration, and End-to-End (E2E) layers.

---

## 1. Global Architecture & State Strategy (`FinanceContext.jsx`)

The application architecture utilizes a single centralized Data Provider (`FinanceProvider`) that orchestrates all asynchronous HTTP operations, local cache management, and reactive propagation throughout the client-side component tree.

```
       ┌────────────────────────────────────────────────────────┐
       │                       main.jsx                         │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │               FinanceProvider (Context)                │
       │   - Orchestrates fetch calls with cookie credentials  │
       │   - Exposes transactional & analytical state fields     │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                       App.jsx                          │
       │   - Protects internal routes via GET /auth/me security  │
       │   - Manages responsive layout shell margins             │
       └───────┬──────────────┬──────────────┬───────────┬──────┘
               ▼              ▼              ▼           ▼
           [Home]        [Planner]    [Transactions] [Analysis]
```

### 1.1 Network Gateway Conventions
* **Base URL**: `http://localhost:3000/api/v1`
* **Session Lifecycle Security**: All network requests explicitly set `credentials: "include"`, enabling the browser to pass and receive secure, HTTP-only tracking cookies for state synchronization.
* **Reactive Cache Triggers**: Cache invalidation is driven by a single numeric state value (`refreshTrigger`). Mutator tasks increment this integer counter, forcing cascading side-effect invocations (`useEffect`) to synchronize updated server-side values across active endpoints.

### 1.2 Data State Taxonomy & Context Mapping

| Context Property | Network Ingestion Vector | Consuming Components | Operational Mapping Rules & Business Context |
| :--- | :--- | :--- | :--- |
| `transactions` | `GET /transactions/` | `Home`, `Transactions` | Converts string representations to floating-point numbers. Maps the backend `description` schema attribute to frontend template variables named `details`. |
| `plannerData` | `GET /budget/values?year={Y}` | `BudgetPlanner` | Separates tracking structures into distinct node segments: `income`, `expenses`, and `savings` categories. Each node breaks down into synchronized 12-element data arrays representing `planned_values` and `actual_values`. |
| `performance` | `GET /budget/performance?year={Y}` | `BudgetPlanner` | Extracts aggregate target baselines versus actual financial outputs for standard grouping layouts. |
| `summary` | `GET /transactions/summary?year={Y}&month={M}` | `Home` | Populates active display values with total metrics indicating incoming resources, outgoing items, and cash flow results. |
| `analysisSnapshot` | `GET /analysis/monthly-snapshot?year={Y}&month={M}` | `Analysis` | Tracks aggregate monthly metrics alongside a month-over-month percentage change variance variable (`mom_change_percentage`). |
| `analysisBreakdown` | `GET /analysis/category-breakdown?year={Y}&month={M}` | `Analysis` | Populates category lists, evaluating data rows against boolean parameters (`is_fixed`) to separate static liabilities from variable lines. |
| `analysisTrends` | `GET /analysis/trends?year={Y}&month={M}` | `Analysis` | Stores structured historic performance history arrays mapping rolling 6-month data fields used to draw line graph trends. |
| `analysisInsights` | `GET /analysis/spending-insights?year={Y}&month={M}` | `Analysis`, `Transactions` | Consumes text strings containing automated anomaly text tags and category flags. |
| `budgetCategories` | `GET /budget/categories` | `Analysis`, `Transactions` | Serves as the source of truth for financial types (`income`, `expense`, `savings`) mapping against customized categorization strings. |
| `settings` | `GET /settings` | `Settings`, `Analysis`, `Transactions` | Persists core system logic variables, calendar formatting layouts, and numerical indices (`income_cutoff_day`) that handle shift assignments. |

---

## 2. Authentication Route Guards & System Shell Layout (`App.jsx`, `Auth.jsx`)

The system separates open authentication pathways from private layout layers through client-side routers (`Routes`).

### 2.1 Router Engine Mechanics
* **Session Evaluation Guard**: On initial execution, a verification challenge targets `GET /auth/me`. 
  * If validation fails (`!res.ok`), global variables are flushed, and user actions are forced to the `/auth` interface.
  * If validated (`200 OK`), structural data models render user components.
* **Visual Flash Protection**: The state uses a tracking indicator (`isCheckingSession`). While verifying access, all standard DOM layout tasks are blocked, showing a clean background loading layout to prevent unauthorized view components from flickering on the screen.
* **Layout Grid Adaptation**: Private paths wrap visual layouts inside a flexible container block (`flex`). The application monitors the toggle flag (`isSidebarOpen`) to dynamic shift the left margin spacing on the main layout component from an open size (`ml-64`) down to a collapsed profile (`ml-20`).

### 2.2 Form Verification Controls (`Auth.jsx`)
* **Mode Isolation**: Changes operation contexts between login and register endpoints via state wrappers (`mode`), wiping existing fields (`email`, `password`) clean on every shift.
* **Implicit Profile Generation**: Registration processes pass automated profiles to `POST /auth/register`. The setup extracts username records from user inputs by parsing email characters preceding the `@` symbol.
* **Notification Layer**: Uses an independent toast messaging engine (`useToast`) backed by custom state transitions. Messages clear automatically after 3.5 seconds using standard delay timeouts, handling alert tasks without reliance on external alert modules.

---

## 3. Component Architectural Specifications

### 3.1 Overview Dashboard (`Home.jsx`)
Coordinates live portfolio calculations, layout asset breakdowns, and aggregated performance summaries.

```
+───────────────────────────────────────────────────────────────────────────+
│ Net Worth (Holdings + Net Cash) │ Savings Rate % │ Monthly Spend ($ Total) │
+───────────────────────────────────────────────────────────────────────────+
│ [Survival & Freedom Metrics Analytics Panel]                              │
+───────────────────────────────────────────────────────────────────────────+
│ [Historical Balance Graph (2/3 Grid)] │ [Asset Allocator Pie (1/3 Grid)]  │
+───────────────────────────────────────────────────────────────────────────+
│ [Recent Transaction Registry - Trailing 5 Records Limiter]                │
+───────────────────────────────────────────────────────────────────────────+
```

#### Analytical Formulas & Data Transformation rules
* **Net Worth Aggregation**: Computed programmatically across client variables:
  $$	ext{Net Worth} = \left( \sum_{h \in 	ext{holdings}} h.	ext{value} ight) + \left( \sum_{t \in 	ext{credits}} t.	ext{amount} - \sum_{t \in 	ext{debits}} |t.	ext{amount}| ight)$$
* **Savings Rate Formula**: Calculated by assessing incoming resource variables against matching ledger parameters:
  $$	ext{Savings Rate} = \left( rac{	ext{Total Income} - 	ext{Total Expenses}}{	ext{Total Income}} ight) 	imes 100$$
  * *Boundary Condition Logic*: If aggregate income metrics equal zero, the engine returns a flat neutral value (`0`), preventing potential runtime crashes from division-by-zero errors.
* **Ledger View Constraints**: The underlying record summary component sets hard boundaries via limiting variables (`limit={5}`), capping active rows to show only the 5 most recent records.

### 3.2 Dynamic Matrix Modeler (`Planner.jsx`)
Presents a 12-month calendar dashboard structured to let users adjust planning targets, map incoming metrics, and evaluate target variances.

#### Layout Filtering Modes (`viewMode`)
* **`budget`**: Grants edit access across column arrays. Unlocks dynamic row creation blocks (`InlineAddCategory`) and item editing tools (`EditableCell`).
* **`actual`**: Overrides user adjustments, changing fields to read-only views showing exact ledger outputs.
* **`delta`**: Compares financial target paths against recorded ledger inputs. Evaluates the difference ($A - B$) and dynamically styles visual components to highlight positive or negative variances.

#### Advanced Interface Mechanics
* **Row-Level Replication**: Double-clicking an active data item triggers bulk processing methods (`bulkUpdateBudgetValues`). This action duplicates that cell's value across all remaining monthly columns in the active calendar row.
* **Inline Label Modifications**: Double-clicking category names swaps out regular labels for text boxes (`EditableCategoryName`). Pressing Enter issues structural updates to `PUT /budget/categories/{id}` before locking fields back into standardized layouts.

### 3.3 Financial Ledger Hub (`Transactions.jsx`)
Features a transaction manager that handles pagination, inline item edits, data filters, and category style assignments.

* **Deterministic Style Ingestion**: Assigns unique color themes to labels without relying on static mapping lists. The application hashes category labels by summing character values, using the result to select an accent layout from an integrated style library:
  $$	ext{Slot Index} = \left( \sum_{c \in 	ext{name}} 	ext{charCodeAt}(c) ight) \pmod{	ext{COLOR\_SLOTS.	ext{length}}}$$
* **Cascading Pipeline Filters**: Refines transactional listings through a multi-stage filtering sequence:

```
[Master Ingested Ledger Array]
              │
              ▼
    [Substring Search] ──────► (Evaluates matches against Details & Category keys)
              │
              ▼
    [Category Filtering] ────► (Isolates exact text matches or passes "All")
              │
              ▼
    [Transaction Type] ──────► (Separates Credit accounts from Debit rows)
              │
              ▼
    [Pagination Slicing] ────► (Slices arrays into fixed sub-segments: PAGE_SIZE = 15)
```

* **Contextual Insight Alignment**: Integrates spending insight items by comparing category tags against the system configuration cache (`budgetCategories`). This process adapts rule warnings based on how accounts are structured:
  * *Standard Expense Fields*: Exceeding budget targets generates a red warning flag, while staying under target shows positive green highlights.
  * *Savings/Investment Categories*: Falling behind performance benchmarks triggers under-budget alert parameters, while exceeding contribution goals highlights rows with positive status signals.

### 3.4 Operational Performance Engine (`Analysis.jsx`)
Aggregates variable data tracking structures, separates fixed costs, and renders visual performance indicators.

* **Asset Segregation**: Filters breakdown lists using binary parameters (`is_fixed`), routing matching costs to structural layout groups while passing variable items to chart components.
* **Conditional Threshold Logic**: Selects visualization colors (`getBarColor`) by checking category types against predefined parameters:

```
For Standard Expense Rows:
  0% ────────────────────────────── 90% ────────── 100% ──────────────►
             [ Emerald ]                 [ Amber ]        [ Rose ]
             Under Budget               Near Limit       Exceeded

For Savings/Investment Rows:
  0% ────────────────────────────── 50% ────────── 100% ──────────────►
              [ Rose ]                   [ Amber ]       [ Emerald ]
             Critical Deficit           Midway Target   Goal Achieved
```

* **Review Acknowledgment Mechanics**: Tracks review activities using local state sets (`acknowledged`). Selecting review indicators toggles an item's status, triggering visual modifications that lower element opacities and apply green border outlines to mark items as complete.

### 3.5 System Logic Configuration Screen (`Settings.jsx`)
Handles user configuration settings, system rules, and interface display templates.

* **Asynchronous Switch Controls**: Selecting a toggle button updates options instantly across interface layouts while quietly running backend patches (`PUT /settings`) to sync changes.
* **Cutoff Validation Checks**: Implements data validation rules on entry fields (`income_cutoff_day`), rejecting input updates that fall outside the allowable 1 to 28 monthly calendar range.
* **Cascading App Invalidations**: When users update core logic controls (e.g., toggling late-income shifting or changing monthly cutoff days), the application increments the centralized `refreshTrigger` key. This triggers a cascading update that re-evaluates accounting data across all ledger lines.

---

## 4. Engineering Quality Assurance & Testing Blueprint

This section provides structural specifications to design automated verification assets across Unit, Integration, and End-to-End frameworks.

### 4.1 Unit Testing Suite (Targeting Pure Invariant Utilities)

#### Test Case Suite 4.1.1: `getBarColor` Behavioral Engine
* **Assertion 1 (Expense Safe Baseline)**: Verify that passing an expense type along with actual use metrics tracking under `90%` of planned bounds returns a green hex code (`#10b981`).
* **Assertion 2 (Expense Limit Warning)**: Ensure that providing an expense type with actual use tracking between `90.1%` and `100%` returns a yellow hex code (`#fbbf24`).
* **Assertion 3 (Expense Breach Alert)**: Verify that providing an expense type with usage metrics tracking above `100%` returns a red hex code (`#f43f5e`).
* **Assertion 4 (Savings Failure State)**: Confirm that passing a savings type with actual values tracking below `50%` of target limits returns a red hex code (`#f43f5e`).
* **Assertion 5 (Savings Achieved State)**: Verify that passing a savings type with actual values meeting or exceeding `100%` of target goals returns a green hex code (`#10b981`).
* **Assertion 6 (Null Budget Fallback)**: Validate that passing a zero value (`0`) for the budget parameter avoids division runtime errors, returning emerald formats for savings types and rose designations for standard expense types.

#### Test Case Suite 4.1.2: Deterministic Hash Colors (`getCategoryColor`)
* **Assertion 1 (Case Matching Uniformity)**: Confirm that running identical string profiles consistently yields the exact same class string.
* **Assertion 2 (Index Range Verification)**: Confirm that processing different character permutations generates an index value that maps correctly to active positions within the `COLOR_SLOTS` array.

---


#### Test Case Suite 4.1.3: Net Worth & Savings Rate Boundary Math
* **Assertion 1 (Absolute Value Debit Subtraction)**: Verify that if debits are passed as negative floating-point numbers (e.g., `-150.00`), the Net Worth calculation accurately processes their absolute magnitude to decrease overall net worth rather than accidentally adding it back.
* **Assertion 2 (Zero Income Isolation)**: Confirm that when `Total Income = 0` and `Total Expenses = 500`, the Savings Rate utility yields exactly `0` rather than throwing a division-by-zero error or rendering `NaN` or `-Infinity`.

---

### 4.2 Integration Testing Suite (Targeting State Flow & Asynchronous Mocks)

All integration test scripts must run within simulated component wrappers (e.g., React Testing Library), using network interception tools to mock API data paths.

#### Test Case Suite 4.2.1: Authentication Session Guards (`App.jsx`)
* **Setup**: Mock the backend network interceptor to return an explicit authentication error (`401 Unauthorized`) for requests targeting `/auth/me`.
* **Execution**: Render the root component tree component (`App`).
* **Assertion 1**: Verify the interface blocks the main dashboard view, showing a loading indicator while the auth challenge processes.
* **Assertion 2**: Confirm that once the network challenge fails, the routing guard catches the error and automatically updates the window location path to `/auth`.

#### Test Case Suite 4.2.2: Optimistic Deletions & Recovery Mode (`FinanceContext.jsx`)
* **Setup**: Populate the local `transactions` state cache with three mock transaction records. Mock the server network proxy to stall or return a `500 Internal Server Error` when intercepting `DELETE` requests targeting `/transactions/{id}`.
* **Execution**: Trigger a delete task on the second transaction row.
* **Assertion 1 (Optimistic Rendering)**: Verify the component instantly drops the targeted row from the DOM table list before the network request finishes.
* **Assertion 2 (State Reversal Rollback)**: Confirm that when the backend returns a processing error, the application catches the fault, runs a background sync, and restores the deleted record to the DOM table list.

#### Test Case Suite 4.2.3: Configuration Invalidation Cascades (`Settings.jsx`)
* **Setup**: Mount `Settings` wrapped inside the global state provider. Initialize data variables with sample information.
* **Execution**: Simulate a user input update that changes the `income_cutoff_day` input field from `25` to `20`, then trigger a field blur action.
* **Assertion 1**: Verify the update registers successfully, dispatching a payload matching the new configuration parameters to `PUT /settings`.
* **Assertion 2**: Confirm the backend sync increments the central state `refreshTrigger` tracking value, causing the transaction engine to re-fetch ledger data.

---


#### Test Case Suite 4.2.4: Responsive Sidebar Grid Layout Shifts
* **Setup**: Render `App.jsx` with the global layout provider.
* **Execution**: Simulate a user clicking the sidebar toggle button to change `isSidebarOpen` from `true` to `false`.
* **Assertion 1**: Verify that the main layout shell component's CSS class instantly changes from `ml-64` (wide margin) to `ml-20` (collapsed margin) to prevent visual component overlapping.

#### Test Case Suite 4.2.5: UI Component Toast Self-Destruction
* **Setup**: Mock a failed registration attempt on `POST /auth/register`.
* **Execution**: Trigger the form submission in `Auth.jsx`.
* **Assertion 1**: Verify the custom toast notification mounts into the DOM displaying the error message.
* **Assertion 2 (Timer Verification)**: Advance the virtual testing timer by `3500ms` and assert that the toast component has successfully unmounted from the DOM without user intervention.

---

### 4.3 End-to-End Testing Matrix (Targeting Core User Workflows)

E2E test scripts must execute within simulated browser context environments (e.g., Playwright, Cypress) against an accessible sandbox testing server.

#### Automated Test Suite 4.3.1: Transaction Addition & Dashboard Synchronization Lifecycle
```
[Auth Route Sandbox] ──► Login Form Submit ──► [/ Path Validation]
                                                     │
                                                     ▼
                                        Navigate to [/transactions]
                                                     │
                                                     ▼
                                          Open Logging Data Modal
                                                     │
                                                     ▼
                                         Complete Input Ingestion
                                                     │
                                                     ▼
                                         Dispatched Commit Trigger
                                                     │
                                                     ▼
                                    Verify Item Insertion in Live DOM
                                                     │
                                                     ▼
                                        Navigate back to [/ Root]
                                                     │
                                                     ▼
                                   Confirm Calculated Metric KPI Updates
```

1. **Step 1**: Load the test environment login page (`/auth`), fill in required account parameters, and click the submission control. Ensure the system sets authorization cookies and routes the user path to the main dashboard container (`/`).
2. **Step 2**: Click the sidebar navigation component targeting the ledger path (`/transactions`). Wait for loading animations to clear, then verify the historical balance cards accurately match active metrics.
3. **Step 3**: Click the transaction addition control (`Add Transaction`) to launch the data modal panel. Fill out the input parameters using explicit variables:
   * **Date**: `2026-05-30`
   * **Category**: `Utilities`
   * **Details**: `E2E Infrastructure Testing Fees`
   * **Amount**: `250.00`
   * **Type**: `Debit (Expense)`
4. **Step 4**: Click the confirmation button to dispatch the record. Ensure the modal window closes automatically.
5. **Step 5**: Scan the transaction table grid. Confirm the new item appears as the top row, displaying the correct format parameters, custom styles, and a negative dollar amount prefix (`-$250.00`).
6. **Step 6**: Click the navigation sidebar item to return to the dashboard overview screen (`/`).
7. **Step 7**: Inspect the core metric summary panels. Verify the `Monthly Spend` panel automatically updates its total value to include the added transaction expenses.

#### Automated Test Suite 4.3.2: Budget Allocation, Row Replication & Mode Analysis Matrix
1. **Step 1**: Access the platform dashboard, authenticate using your verification credentials, and navigate to the planning portal screen (`/budget`).
2. **Step 2**: Locate the matrix display controls and toggle the application state filter to target `Budget` processing modes. Verify the template cells update to show editable number inputs.
3. **Step 3**: Locate the first standard expense entry row. Select the January calendar column input field, change the value to `450`, and press the Enter key to save.
4. **Step 4**: Move your cursor back to the January column field and double-click the cell.
5. **Step 5**: Scan across the remaining monthly columns for that row. Confirm the row replication tool automatically populates the value `450` into every month column from February through December.
6. **Step 6**: Navigate to the display filter controls and change the mode toggle from `Budget` over to `Delta` mode.
7. **Step 7**: Verify all columns reload as read-only fields displaying calculated variance values. Ensure the cells apply appropriate background highlights that match the system's conditional formatting rules.


#### Automated Test Suite 4.3.3: Inline Category Rename Validation Lifecycle
1. **Step 1**: Navigate to the planner portal (`/budget`) and double-click an existing category name label.
2. **Step 2**: Verify the standard text label switches to an active text input box (`EditableCategoryName`) containing the current name.
3. **Step 3**: Type a modified category string name (e.g., `Utilities & Server Infrastructure`) and press the `Enter` key.
4. **Step 4**: Intercept the network layer and assert that a `PUT /budget/categories/{id}` request was dispatched with the updated payload.
5. **Step 5**: Verify that the text input wrapper closes, locking back into a stable UI label displaying the new string name.

#### Automated Test Suite 4.3.4: Configuration Change & App-Wide Recalculation Cascade
1. **Step 1**: Navigate to `/settings` and locate the `income_cutoff_day` input box.
2. **Step 2**: Clear the value, enter an invalid day out of range (e.g., `31`), and trigger a blur event. Assert that the interface rejects the update and retains its previous state.
3. **Step 3**: Change the input value to a valid day (e.g., `20`) and trigger a blur event. Verify that a `PUT /settings` request is successfully sent.
4. **Step 4**: Navigate immediately back to the transaction registry (`/transactions`).
5. **Step 5**: Assert that the underlying ledger fetch request (`GET /transactions/`) is automatically fired a second time. This proves that the central `refreshTrigger` integer successfully incremented and forced an application-wide data refresh.
