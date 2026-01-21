---
id: "F-093"
feature: "query-field-output"
status: "draft"
created: "2026-01-21"
---

# Specification: Query Field Output

## Overview

Extend the query command output to include custom field values from tagged nodes, not just core node properties. This enables users to export structured data (like all person contacts with email, phone, etc.) directly from queries using familiar SQL-like `select` syntax.

**Current behavior:** Query output returns only core node fields: `id`, `name`, `created`, `updated`

**New behavior:** Query output can include custom field values via the `select` clause in the query language.

## User Scenarios

### Scenario 1: Export All Person Data

**As a** Tana user
**I want to** query all person nodes with all their field values
**So that** I can export a complete contact list to CSV

**Example:**
```bash
supertag query "find person select *" --format csv > contacts.csv
```

**Acceptance Criteria:**
- [ ] `select *` includes all fields defined on the person supertag
- [ ] Output includes both core fields (id, name, created, updated) and custom fields (email, phone, etc.)
- [ ] CSV format has proper column headers for all fields
- [ ] Empty field values render as empty strings, not "(none)"

### Scenario 2: Export Specific Fields Only

**As a** Tana user
**I want to** query nodes with only specific fields I need
**So that** I get clean output without unnecessary columns

**Example:**
```bash
supertag query 'find person select "name,email,company"' --format csv
```

**Acceptance Criteria:**
- [ ] Only specified fields appear in output
- [ ] Field names are case-insensitive for matching
- [ ] Unknown field names are silently ignored (no error)
- [ ] Fields can be specified as comma-separated list in quotes

### Scenario 3: Default Behavior (No Select)

**As a** Tana user
**I want to** queries without `select` to work as they do today
**So that** existing scripts and workflows continue functioning

**Example:**
```bash
supertag query "find task where Status = Done"
# Returns: id, name, created, updated (current behavior)
```

**Acceptance Criteria:**
- [ ] No `select` clause = core fields only (backward compatible)
- [ ] No CLI flags needed for default behavior
- [ ] No performance impact on queries without `select`

### Scenario 4: Include Inherited Fields

**As a** Tana user
**I want to** `select *` to include inherited fields from parent supertags
**So that** I get the complete picture of a node's data

**Example:**
A `#employee` supertag extends `#person`. Querying employees should include both employee-specific fields and inherited person fields.

**Acceptance Criteria:**
- [ ] `select *` follows supertag inheritance chain
- [ ] Field order: core fields, then own fields, then inherited fields
- [ ] Duplicate field names from inheritance are deduplicated

## Functional Requirements

### FR-1: Select Clause Parsing

The query parser must handle three `select` variants:

| Syntax | Behavior |
|--------|----------|
| (none) | Core fields only: id, name, created, updated |
| `select *` | All fields defined on the supertag + inherited |
| `select "f1,f2,f3"` | Only specified fields + always include id |

**Validation:** Parser tests for each variant produce correct AST

### FR-2: Field Value Retrieval

Query engine must JOIN with `field_values` table and pivot field values into columns.

```sql
-- Conceptual query for "find person select *"
SELECT
  n.id, n.name, n.created, n.updated,
  MAX(CASE WHEN fv.field_name = 'Email' THEN fv.value_text END) as Email,
  MAX(CASE WHEN fv.field_name = 'Phone' THEN fv.value_text END) as Phone
  -- ... dynamic for all fields
FROM nodes n
INNER JOIN tag_applications ta ON ta.data_node_id = n.id
LEFT JOIN field_values fv ON fv.parent_id = n.id
WHERE ta.tag_name = ?
GROUP BY n.id
```

**Validation:** Integration test comparing query output with expected field values

### FR-3: Field Definition Lookup

For `select *`, the engine must look up which fields are defined on the supertag:

1. Query `field_definitions` table for the supertag
2. Follow inheritance chain for parent supertags
3. Collect unique field names

**Validation:** Unit test with supertag having own + inherited fields

### FR-4: Output Formatting

All output formats must support dynamic columns:

| Format | Field Output |
|--------|--------------|
| `json` | Object with all field keys |
| `csv` | Header row includes all fields |
| `table` | Columns for all fields |
| `jsonl` | Each line includes all fields |
| `ids` | Unchanged (id only) |
| `minimal` | Add fields to minimal output |

**Validation:** Format integration tests with field output

### FR-5: Multi-Value Field Handling

Fields can have multiple values (e.g., tags, references). These must be handled:

| Approach | Output |
|----------|--------|
| First value | `"value1"` |
| Comma-joined | `"value1, value2, value3"` |
| JSON array | `["value1", "value2"]` |

**Decision needed:** Which approach to use? Recommend comma-joined for CSV compatibility.

**Validation:** Test with multi-value field

## Non-Functional Requirements

- **Performance:** Adding `select *` should not significantly degrade query performance for small result sets (<1000 nodes). For large exports, performance is acceptable.
- **Security:** No additional security concerns (read-only operation)
- **Scalability:** Field pivot should handle supertags with up to 50 fields
- **Failure Behavior:**
  - On unknown field name in explicit select: Silently ignore, include only known fields
  - On supertag with no defined fields: Return only core fields
  - On field_values JOIN failure: Log warning, return core fields only

## Key Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| `field_definitions` | Defines fields on a supertag | field_name, supertag_id, field_type |
| `field_values` | Stores actual field values | parent_id, field_name, value_text |
| `QueryAST.select` | Parsed select clause | string[] or "*" |

## Success Criteria

- [ ] `supertag query "find person select *" --format csv` exports all person data
- [ ] Existing queries without `select` work unchanged
- [ ] All 6 output formats support field columns
- [ ] Inherited fields included in `select *`
- [ ] Performance acceptable for 1000-node export

## Assumptions

| Assumption | What Would Invalidate It | Detection Strategy |
|-----------|-------------------------|-------------------|
| Field names are unique within a supertag | Name collisions in inheritance | Query returns duplicate columns |
| field_values uses consistent field_name | Historical data with different names | Empty columns for fields that should have data |
| Supertag inheritance is single-level | Deep inheritance chains | Missing inherited fields |

## System Context

### Upstream Dependencies

| System | What We Get | What Breaks If It Changes | Version/Contract |
|--------|-------------|---------------------------|------------------|
| field_values table | Field data for nodes | Query returns empty fields | Current schema |
| field_definitions table | Field names for supertag | `select *` returns wrong fields | Current schema |
| tag_applications table | Node-to-tag mapping | Query finds no nodes | Current schema |

### Downstream Consumers

| System | What They Expect | Breaking Change Threshold |
|--------|-----------------|--------------------------|
| MCP tools | JSON output with fields | Adding fields is additive, safe |
| CLI scripts | CSV export format | Column order must be stable |

### Adjacent Systems (Implicit Coupling)

| System | Implicit Dependency | Risk |
|--------|---------------------|------|
| Aggregation command | Uses same field_values | Changes to field query could affect aggregation |

## Out of Scope

- **CLI flags**: No `--fields` or `--select` CLI options. Use query language only.
- **Field type coercion**: Values returned as strings, no date/number formatting
- **Field filtering in WHERE**: Already supported separately
- **Nested object output**: Fields are flat columns, not nested JSON
- **Field renaming/aliasing**: `select email as contact_email` not supported
