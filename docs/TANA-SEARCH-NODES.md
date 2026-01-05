# Tana Search Nodes and Contextual Fields

**Deep Technical Analysis** | Last Updated: 2026-01-05

This document describes how Tana stores search nodes (live searches) and their contextual fields based on analysis of the `Weihnachtsbriefliste` search node (`6ItDVXuBxP7P`).

## Overview

Search nodes in Tana are special nodes with `_docType: "search"` that:
1. Define a filter (e.g., find all `#person` nodes)
2. Display results as children (dynamically updated)
3. Can have **contextual fields** - fields that attach to items **within the search context** without modifying the original nodes

## Node Structure

### Search Node Properties

```json
{
  "id": "6ItDVXuBxP7P",
  "props": {
    "name": "Weihnachtsbriefliste",
    "_docType": "search",
    "_metaNodeId": "y6plKAXVhx-o",
    "_ownerId": "2bmdb-SRe_GF"
  },
  "children": ["NkOlmfgaL9", "t79uqXOI0n", ...],  // 707 person IDs
  "associationMap": {
    "personNodeId": "associatedDataNodeId",
    ...
  }
}
```

### Key Properties

| Property | Description |
|----------|-------------|
| `_docType` | `"search"` indicates this is a search node |
| `_metaNodeId` | Points to the view definition (columns, filters) |
| `children` | Array of node IDs matching the search filter |
| `associationMap` | Maps each result node to its contextual field data |

## Search Filter Configuration

The search filter is defined through the `_metaNodeId` hierarchy:

```
Search Node (6ItDVXuBxP7P)
  └─ _metaNodeId → MetaNode (y6plKAXVhx-o)
       └─ children → [tuple1, tuple2]
            ├─ SYS_A16 tuple → viewDef (Default)
            │    └─ children → view configuration tuples
            │         ├─ SYS_A15 → Tag filter (person tagDef)
            │         ├─ SYS_A17 → Column definitions
            │         ├─ SYS_A18 → Contextual field definitions
            │         └─ SYS_A19 → Sort order
            └─ SYS_A62 tuple → Field defaults
```

### Supertag Filter

The search filters by supertag through a tuple containing `SYS_A15`:

```json
{
  "id": "Os9njRBv77V7",
  "props": { "_docType": "tuple" },
  "children": ["SYS_A15", "YJOJebjABK", ...]
}
```

Where `YJOJebjABK` is the `#person` tagDef:
```json
{
  "id": "YJOJebjABK",
  "props": {
    "name": "person",
    "_docType": "tagDef"
  }
}
```

## Contextual Fields

### What Are Contextual Fields?

Contextual fields are special fields that:
- **Attach to nodes within a search context** (not to the original nodes)
- **Are stored in the search node's `associationMap`**
- Allow tracking per-item data that only makes sense in this specific search
- Example: "Brief 2024" checkbox on each person in the Christmas letter list

### Storage Structure

```
Search Node
  └─ associationMap: { "personId": "associatedDataId" }
       └─ associatedData node (_docType: "associatedData")
            └─ tuple children (one per contextual field)
                 ├─ [fieldId, valueId]  // e.g., ["250riUuys0uA", "SYS_V04"]
                 └─ [fieldId, valueId]
```

### Example: Weihnachtsbriefliste Contextual Fields

This search has THREE contextual checkbox fields:

| Field | Field ID | Purpose |
|-------|----------|---------|
| Brief 2023 | `250riUuys0uA` | Track who got a letter in 2023 |
| Brief 2024 | `pOyVop76XDg0` | Track who got a letter in 2024 |
| Brief 2025 | `qmcmOOK1Eaov` | Track who got a letter in 2025 |

### Checkbox Values

Checkbox fields use system value nodes:

| Value ID | Meaning | Notes |
|----------|---------|-------|
| `SYS_V03` | **Checked** (☑) | Default/most common state |
| `SYS_V04` | **Unchecked** (☐) | Explicitly unchecked |
| `SYS_V58` | Unknown | Third state - possibly "indeterminate" or legacy value. Found on 2 Brief 2023 entries but those people are no longer in the search. |

**Verified**: Based on user confirmation:
- Monika Halbe has Brief 2023 = ✓ (SYS_V03), Brief 2024 = ☐ (SYS_V04)
- Monika Ide has Brief 2023 = ✓ (SYS_V03), Brief 2024 = ✓ (SYS_V03)

**Distribution** (as of 2026-01-05):
- Brief 2023: 70 checked (V03), 20 unchecked (V04), 2 unknown (V58)
- Brief 2024: 78 checked (V03), 2 unchecked (V04)
- Brief 2025: 80 checked (V03), 0 unchecked (new field)

### Data Path Example

To find "Brief 2024" value for person "Monika Halbe" (`xDz9hRFaIbBR`):

```
1. Search node: 6ItDVXuBxP7P
2. associationMap["xDz9hRFaIbBR"] → "Bzw3YkSYHW2J"
3. Node "Bzw3YkSYHW2J" (associatedData):
   {
     "children": ["jv4VnymU1l8u", "HnkposkcNahJ"]
   }
4. Tuple "HnkposkcNahJ":
   {
     "children": ["pOyVop76XDg0", "SYS_V04"]
   }
   → Brief 2024 field, unchecked (SYS_V04 = ☐)
```

## Field Definition Structure

Contextual fields are defined in the viewDef's field configuration:

```json
{
  "id": "pOyVop76XDg0",
  "props": {
    "name": "Brief 2024",
    "_ownerId": "DnxiBz1zczrz",
    "_metaNodeId": "leF-Ufj773kp"
  },
  "children": ["WdCtXrxccKwZ"]  // typeChoice tuple
}
```

The `typeChoice` tuple defines the field type:
```json
{
  "id": "WdCtXrxccKwZ",
  "props": {
    "name": "typeChoice",
    "_sourceId": "SYS_A02"
  },
  "children": ["SYS_T06", "SYS_D01"]  // Type and default value
}
```

## System Nodes Reference

| Node ID Pattern | Purpose |
|-----------------|---------|
| `SYS_A*` | Attribute/field type definitions |
| `SYS_T*` | Type definitions (e.g., SYS_T06 = checkbox?) |
| `SYS_D*` | Default value definitions |
| `SYS_V*` | Value definitions (e.g., V03/V04 for checkbox states) |

### Known SYS_A Nodes (from viewDef)

| ID | Purpose (inferred) |
|----|-------------------|
| `SYS_A15` | Supertag filter |
| `SYS_A16` | View definition reference |
| `SYS_A17` | Column/field configuration |
| `SYS_A18` | Contextual field definition |
| `SYS_A19` | Sort configuration |
| `SYS_A62` | Field defaults |
| `SYS_A71` | Aggregate/calculation |
| `SYS_A72` | COUNT_VALUES calculation |

## Querying Contextual Fields

### SQL Query: Find all persons with Brief 2023 checked

```sql
-- Get associatedData nodes with Brief 2023 = SYS_V04
SELECT n.id, n.raw_data
FROM nodes n
WHERE n.raw_data LIKE '%250riUuys0uA%SYS_V04%'
  AND json_extract(n.raw_data, '$.props._docType') = 'tuple';
```

### Reverse lookup: Get person name from tuple

```sql
-- 1. Get _ownerId from tuple (points to associatedData)
-- 2. Look up associatedData in search node's associationMap
-- 3. Get person node name
```

## Implementation Notes

### For supertag-cli

To materialize contextual field values:

1. Query the search node to get `associationMap`
2. For each person in `children`:
   - Look up their `associatedDataId` in `associationMap`
   - Query the `associatedData` node
   - Parse tuple children to get `[fieldId, valueId]` pairs
3. Map `valueId` to actual value (e.g., `SYS_V03` → `true`, `SYS_V04` → `false`)

### SQL Implementation

```sql
-- Get all contextual field values for a search node
WITH search_node AS (
  SELECT
    id,
    raw_data,
    json_extract(raw_data, '$.associationMap') as assoc_map
  FROM nodes
  WHERE id = '6ItDVXuBxP7P'  -- search node ID
),
person_assoc AS (
  SELECT
    key as person_id,
    value as assoc_data_id
  FROM search_node, json_each(search_node.assoc_map)
),
assoc_tuples AS (
  SELECT
    pa.person_id,
    jt.value as tuple_id
  FROM person_assoc pa
  JOIN nodes n ON n.id = pa.assoc_data_id
  CROSS JOIN json_each(json_extract(n.raw_data, '$.children')) jt
),
field_values AS (
  SELECT
    at.person_id,
    json_extract(n.raw_data, '$.children[0]') as field_id,
    json_extract(n.raw_data, '$.children[1]') as value_id
  FROM assoc_tuples at
  JOIN nodes n ON n.id = at.tuple_id
)
SELECT
  p.name as person_name,
  fv.person_id,
  f.name as field_name,
  fv.field_id,
  CASE fv.value_id
    WHEN 'SYS_V03' THEN 'checked'
    WHEN 'SYS_V04' THEN 'unchecked'
    ELSE fv.value_id
  END as value
FROM field_values fv
JOIN nodes p ON p.id = fv.person_id
LEFT JOIN nodes f ON f.id = fv.field_id
ORDER BY p.name, f.name;
```

### CLI Script Example

```bash
#!/bin/bash
# Get contextual field values for a search node

SEARCH_NODE_ID="6ItDVXuBxP7P"
DB=~/.local/share/supertag/workspaces/main/tana-index.db

# Get associationMap
ASSOC_MAP=$(sqlite3 "$DB" "SELECT raw_data FROM nodes WHERE id = '$SEARCH_NODE_ID'" | jq -r '.associationMap')

# For each person, get their contextual field values
echo "$ASSOC_MAP" | jq -r 'to_entries[] | "\(.key)|\(.value)"' | while IFS='|' read -r person_id assoc_id; do
  person_name=$(sqlite3 "$DB" "SELECT name FROM nodes WHERE id = '$person_id'")

  # Get tuple children from associatedData
  sqlite3 "$DB" "SELECT raw_data FROM nodes WHERE id = '$assoc_id'" | jq -r '.children[]' | while read tuple_id; do
    tuple_data=$(sqlite3 "$DB" "SELECT raw_data FROM nodes WHERE id = '$tuple_id'")
    field_id=$(echo "$tuple_data" | jq -r '.children[0]')
    value_id=$(echo "$tuple_data" | jq -r '.children[1]')
    field_name=$(sqlite3 "$DB" "SELECT name FROM nodes WHERE id = '$field_id'")

    # Map value
    case "$value_id" in
      SYS_V03) value="✓" ;;
      SYS_V04) value="☐" ;;
      *) value="$value_id" ;;
    esac

    echo "$person_name|$field_name|$value"
  done
done | column -t -s'|'
```

### Challenges

1. **No direct link**: Contextual fields are stored separately from person nodes
2. **Indirect lookup**: Requires traversing `associationMap` → `associatedData` → tuples
3. **System values**: Need to understand `SYS_V*` value encoding
4. **Field definitions**: Contextual fields are defined in viewDef, not in schema

## Verified Data

Based on analysis of `6ItDVXuBxP7P` on 2026-01-05:

| Person | Brief 2023 | Brief 2024 | Brief 2025 | Interpretation |
|--------|------------|------------|------------|----------------|
| Monika Halbe | SYS_V03 | SYS_V04 | - | 2023=✓, 2024=☐, 2025=not set |
| Monika Ide | SYS_V03 | SYS_V03 | SYS_V03 | 2023=✓, 2024=✓, 2025=✓ |

**Confirmed**: SYS_V03 = checked, SYS_V04 = unchecked (initially counter-intuitive)

## Future Work

1. ~~Verify SYS_V03/V04 checkbox interpretation~~ ✅ Done: V03=checked, V04=unchecked
2. Investigate SYS_V58 - third checkbox state?
3. Implement MCP tool to query contextual fields
4. Add supertag-cli command: `supertag search show <nodeId> --contextual-fields`
5. Document all SYS_* node types
6. Handle Brief 2025 and future contextual fields dynamically

## Related Files

- Search node analysis: `6ItDVXuBxP7P`
- Person tagDef: `YJOJebjABK`
- Brief 2023 field: `250riUuys0uA`
- Brief 2024 field: `pOyVop76XDg0`
- Brief 2025 field: `qmcmOOK1Eaov`
- ViewDef: `vMMFDc-SW39p`

## References

- CLAUDE.md section on field/tuple structures
- TANA-FIELD-STRUCTURES.md for general field handling
