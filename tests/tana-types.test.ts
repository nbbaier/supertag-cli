/**
 * TDD Test Suite for Tana Type Definitions
 *
 * RED phase: These tests will fail until we implement the types
 */

import { describe, test, expect } from "bun:test";
import { TanaDumpSchema, PropsSchema, NodeDumpSchema, VisualizerSchema } from "../src/types/tana-dump";

describe("TanaDump Type Validation (🔴 RED)", () => {
  test("should validate Props schema", () => {
    const validProps = {
      created: 1658231799627,
      name: "Test Node",
      description: "Test description",
      _ownerId: "K4hTe8I__k",
      _metaNodeId: "My54gnXjkF",
      _docType: "home",
      editMode: false,
      done: null,
    };

    const result = PropsSchema.safeParse(validProps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Node");
      expect(result.data._ownerId).toBe("K4hTe8I__k");
    }
  });

  test("should validate Props with minimal fields", () => {
    const minimalProps = {
      created: 1658231799627,
    };

    const result = PropsSchema.safeParse(minimalProps);
    expect(result.success).toBe(true);
  });

  test("should validate NodeDump schema with full data", () => {
    const validNode = {
      id: "inStMOS_Za",
      props: {
        created: 1658231799627,
        _docType: "home",
        _metaNodeId: "My54gnXjkF",
        name: "JCF Public",
        _ownerId: "K4hTe8I__k",
      },
      touchCounts: [19, 1],
      modifiedTs: [1729240382469, 1737469132756],
      children: ["Zav78iOqBp", "7IsZERgAIY", "OcNtXHOTjm"],
      inbound_refs: [],
      outbound_refs: [],
    };

    const result = NodeDumpSchema.safeParse(validNode);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("inStMOS_Za");
      expect(result.data.props.name).toBe("JCF Public");
      expect(result.data.children).toHaveLength(3);
    }
  });

  test("should validate supertag tuple node", () => {
    const supertagTuple = {
      id: "SYS_T01_META_SYS_A13",
      props: {
        created: 1764350227375,
        _docType: "tuple",
        _ownerId: "SYS_T01_META",
      },
      children: ["SYS_A13", "SYS_T01"],
    };

    const result = NodeDumpSchema.safeParse(supertagTuple);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.children).toContain("SYS_A13");
      expect(result.data.children).toContain("SYS_T01");
    }
  });

  test("should validate field tuple node", () => {
    const fieldTuple = {
      id: "SYS_T03_META_SYS_A13",
      props: {
        created: 1764350227376,
        _docType: "tuple",
        _ownerId: "SYS_T03_META",
      },
      children: ["SYS_A13", "SYS_T02"],
    };

    const result = NodeDumpSchema.safeParse(fieldTuple);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.children).toContain("SYS_A13");
      expect(result.data.children).toContain("SYS_T02");
    }
  });

  test("should validate Visualizer schema", () => {
    const visualizer = {
      include_tag_tag_links: true,
      include_node_tag_links: true,
      include_inline_refs: true,
      include_inline_ref_nodes: false,
    };

    const result = VisualizerSchema.safeParse(visualizer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_inline_ref_nodes).toBe(false);
    }
  });

  test("should validate TanaDump schema with real structure", () => {
    const tanaDump = {
      formatVersion: 1,
      docs: [
        {
          id: "SYS_T01",
          props: {
            created: 1764350227365,
            name: "supertag",
            description: "The Core supertag",
            _docType: "tagDef",
            _ownerId: "SYS_T00",
            _metaNodeId: "SYS_T01_META",
          },
        },
        {
          id: "inStMOS_Za",
          props: {
            created: 1658231799627,
            name: "JCF Public",
            _ownerId: "K4hTe8I__k",
          },
          children: ["child1", "child2"],
        },
      ],
      editors: [["editor1@example.com", 0], ["editor2@example.com", 1]],
      workspaces: {
        workspace1: "name1",
        workspace2: "name2",
      },
      lastTxid: 12345,
      currentWorkspaceId: "workspace1",
    };

    const result = TanaDumpSchema.safeParse(tanaDump);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formatVersion).toBe(1);
      expect(result.data.docs).toHaveLength(2);
      expect(result.data.docs[0].props.name).toBe("supertag");
    }
  });

  test("should reject invalid TanaDump (missing required fields)", () => {
    const invalidDump = {
      formatVersion: 1,
      // missing docs, editors, workspaces
    };

    const result = TanaDumpSchema.safeParse(invalidDump);
    expect(result.success).toBe(false);
  });

  test("should reject invalid NodeDump (missing id)", () => {
    const invalidNode = {
      props: {
        created: 1658231799627,
        name: "Test",
      },
    };

    const result = NodeDumpSchema.safeParse(invalidNode);
    expect(result.success).toBe(false);
  });

  test("should handle node with null done value", () => {
    const nodeWithDone = {
      id: "test123",
      props: {
        created: 1658231799627,
        done: null,
      },
    };

    const result = NodeDumpSchema.safeParse(nodeWithDone);
    expect(result.success).toBe(true);
  });

  test("should handle node with boolean done value", () => {
    const nodeWithDone = {
      id: "test123",
      props: {
        created: 1658231799627,
        done: true,
      },
    };

    const result = NodeDumpSchema.safeParse(nodeWithDone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.props.done).toBe(true);
    }
  });

  test("should handle node with integer done value", () => {
    const nodeWithDone = {
      id: "test123",
      props: {
        created: 1658231799627,
        done: 1658231799627,
      },
    };

    const result = NodeDumpSchema.safeParse(nodeWithDone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.props.done).toBe(1658231799627);
    }
  });
});
