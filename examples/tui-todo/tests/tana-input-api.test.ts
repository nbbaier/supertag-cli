/**
 * T-1.4: TanaInputApi Tests
 * TDD: RED phase - write tests before implementation
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { TanaInputApi, type TanaInputConfig } from "../src/services/tana-input-api";

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve(new Response()));

describe("TanaInputApi", () => {
  let api: TanaInputApi;
  const config: TanaInputConfig = {
    apiToken: "test-token-123",
    targetNodeId: "INBOX",
  };

  beforeEach(() => {
    api = new TanaInputApi(config);
    // Reset mock
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    // Override global fetch
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  describe("constructor", () => {
    it("should create instance with config", () => {
      expect(api).toBeDefined();
    });

    it("should throw if apiToken is missing", () => {
      expect(() => new TanaInputApi({ apiToken: "", targetNodeId: "INBOX" })).toThrow(
        "API token is required"
      );
    });
  });

  describe("createTodo", () => {
    it("should create a todo with title", async () => {
      const result = await api.createTodo({ title: "Test todo" });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should call Tana Input API with correct payload", async () => {
      await api.createTodo({ title: "Buy groceries", priority: "high" });

      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const [url, options] = call;
      expect(url).toBe("https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2");
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer test-token-123",
      });

      const body = JSON.parse(options.body as string);
      expect(body.targetNodeId).toBe("INBOX");
      expect(body.nodes).toBeDefined();
      expect(body.nodes.length).toBe(1);
      expect(body.nodes[0].name).toBe("Buy groceries");
    });

    it("should include Todo supertag", async () => {
      await api.createTodo({ title: "Test" });

      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const [, options] = call;
      const body = JSON.parse(options.body as string);
      expect(body.nodes[0].supertags).toBeDefined();
      expect(body.nodes[0].supertags[0].id).toBe("Todo");
    });

    it("should include optional fields when provided", async () => {
      await api.createTodo({
        title: "Important task",
        priority: "high",
        dueDate: "2024-01-15",
      });

      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const [, options] = call;
      const body = JSON.parse(options.body as string);
      const children = body.nodes[0].children;

      // Should have field children for priority and dueDate
      expect(children).toBeDefined();
      expect(children.some((c: { name: string }) => c.name?.includes("Priority"))).toBe(true);
      expect(children.some((c: { name: string }) => c.name?.includes("Due Date"))).toBe(true);
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
        })
      );

      const result = await api.createTodo({ title: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await api.createTodo({ title: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  describe("setTargetNode", () => {
    it("should update target node ID", async () => {
      api.setTargetNode("CUSTOM_NODE_ID");
      await api.createTodo({ title: "Test" });

      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const [, options] = call;
      const body = JSON.parse(options.body as string);
      expect(body.targetNodeId).toBe("CUSTOM_NODE_ID");
    });
  });
});
