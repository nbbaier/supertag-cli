/**
 * TanaInputApi - Create todos via Tana Input API
 */

export interface TanaInputConfig {
  apiToken: string;
  targetNodeId: string;
}

export interface CreateTodoInput {
  title: string;
  priority?: string;
  dueDate?: string;
}

export interface CreateTodoResult {
  success: boolean;
  error?: string;
}

interface TanaNode {
  name: string;
  supertags?: Array<{ id: string }>;
  children?: TanaNode[];
}

interface TanaInputPayload {
  targetNodeId: string;
  nodes: TanaNode[];
}

const TANA_INPUT_API_URL =
  "https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2";

export class TanaInputApi {
  private config: TanaInputConfig;

  constructor(config: TanaInputConfig) {
    if (!config.apiToken) {
      throw new Error("API token is required");
    }
    this.config = config;
  }

  /**
   * Create a new todo in Tana
   */
  async createTodo(input: CreateTodoInput): Promise<CreateTodoResult> {
    const node = this.buildTodoNode(input);
    const payload: TanaInputPayload = {
      targetNodeId: this.config.targetNodeId,
      nodes: [node],
    };

    try {
      const response = await fetch(TANA_INPUT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update the target node where todos are created
   */
  setTargetNode(nodeId: string): void {
    this.config.targetNodeId = nodeId;
  }

  /**
   * Build a Tana node structure for a todo
   */
  private buildTodoNode(input: CreateTodoInput): TanaNode {
    const node: TanaNode = {
      name: input.title,
      supertags: [{ id: "Todo" }],
    };

    const children: TanaNode[] = [];

    if (input.priority) {
      children.push({
        name: `Priority:: ${input.priority}`,
      });
    }

    if (input.dueDate) {
      children.push({
        name: `Due Date:: ${input.dueDate}`,
      });
    }

    if (children.length > 0) {
      node.children = children;
    }

    return node;
  }
}
