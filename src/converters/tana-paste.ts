/**
 * Tana Paste Format Converter
 *
 * Bidirectional conversion between JSON and Tana Paste format
 *
 * Tana Paste Format:
 * - Hierarchical text using bullet points and indentation
 * - Lines start with "- " (dash space)
 * - 2 spaces per indentation level
 * - Fields use ":: " separator (e.g., "- Status:: Done")
 * - Code blocks use ``` delimiters
 */

export interface TanaNode {
  name?: string;
  children?: TanaNode[];
  [key: string]: any; // Fields
}

/**
 * Bidirectional Tana Paste converter
 */
export class TanaPasteConverter {
  /**
   * Convert JSON to Tana Paste format
   */
  jsonToTana(input: TanaNode | TanaNode[]): string {
    // Handle array input
    if (Array.isArray(input)) {
      return this.nodesToTana(input, 0);
    }

    return this.nodesToTana([input], 0);
  }

  /**
   * Convert Tana Paste to JSON
   */
  tanaToJson(input: string): TanaNode[] {
    interface ParseNode {
      name?: string;
      isField: boolean;
      field?: string;
      value?: any;
      children?: ParseNode[];
    }

    const addChild = (parent: ParseNode, child: ParseNode) => {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(child);
    };

    const stack: ParseNode[] = [];
    const root: ParseNode = { name: "ROOT", isField: false };
    let current = root;
    stack.push(root);
    let currentLevel = 1;
    let inCodeBlock = false;
    let codeBlock = "";

    const lines = input.split("\n");

    for (let line of lines) {
      line = line.trimEnd();

      // Skip empty lines or standalone dashes
      if (line === "" || line === "-") {
        continue;
      }

      // Handle code blocks
      if (inCodeBlock) {
        codeBlock += line + "\n";
        if (line.startsWith("```")) {
          inCodeBlock = false;
          if (current.isField) {
            current.value = codeBlock;
          } else {
            // Code block as sibling
            const newNode: ParseNode = {
              name: codeBlock,
              isField: false,
            };
            addChild(stack[stack.length - 1], newNode);
            current = newNode;
          }
        }
        continue;
      }

      // Check for code block start
      if (!line.includes("-") && line.includes("```")) {
        codeBlock = line + "\n";
        inCodeBlock = true;
        continue;
      }

      // Skip lines without dash
      if (!line.includes("-")) {
        continue;
      }

      // Calculate indentation level
      const leader = line.split("-")[0];
      const level = Math.floor(leader.length / 2) + 1;

      // Remove leading spaces and dash
      line = line.trimStart().replace(/^-\s*/, "");

      // Check if line is a field
      const isField = line.includes("::");
      let field: string | undefined;
      let value: any;

      if (isField) {
        const parts = line.split("::");
        field = parts[0].trim();
        value = parts[1]?.trim() || undefined;
      }

      const newNode: ParseNode = {
        name: line,
        isField,
        field,
        value,
      };

      // Handle level changes
      if (level < currentLevel) {
        // Exdent: pop stack
        const popCount = currentLevel - level;
        for (let i = 0; i < popCount; i++) {
          stack.pop();
        }
        addChild(stack[stack.length - 1], newNode);
        current = newNode;
        currentLevel = level;
      } else if (level > currentLevel) {
        // Indent: child of current
        addChild(current, newNode);
        stack.push(current);
        current = newNode;
        currentLevel = level;
      } else {
        // Same level: sibling
        addChild(stack[stack.length - 1], newNode);
        current = newNode;
      }
    }

    // Process tree: hoist fields and clean structure
    const hoistField = (node: ParseNode, parent: any) => {
      let value = node.value;
      if (node.children) {
        if (value && node.children) {
          throw new Error("Field with both value and children not supported");
        }
        if (node.children.length > 0) {
          value = processNodes(node.children);
        }
      }
      parent[node.field!] = value;
    };

    const processNode = (node: ParseNode): any => {
      if (node.isField) {
        return { field: node.field, value: node.value, children: node.children };
      }

      const result: any = {};
      if (node.name) {
        result.name = node.name;
      }

      if (node.children) {
        for (const child of node.children) {
          if (child.isField) {
            const processed = processNode(child);
            hoistField(processed, result);
          } else {
            if (!result.children) {
              result.children = [];
            }
            result.children.push(processNode(child));
          }
        }
      }

      return result;
    };

    const processNodes = (nodes: ParseNode[]): any[] => {
      return nodes.map((node) => processNode(node));
    };

    // Process root children
    return processNodes(root.children || []);
  }

  /**
   * Convert array of nodes to Tana Paste
   */
  private nodesToTana(nodes: TanaNode[], indent: number): string {
    let result = "";

    for (const node of nodes) {
      const spaces = " ".repeat(indent);

      // Handle children array
      const children = node.children || [];

      // Output name if present
      if (node.name !== undefined) {
        if (node.name.includes("```")) {
          // Code block
          result += this.codeToTana(node.name, indent);
        } else {
          result += `${spaces}- ${node.name}\n`;
        }
      }

      // Output fields (all keys except 'name' and 'children')
      const fieldIndent = node.name ? indent + 2 : indent;
      for (const [key, value] of Object.entries(node)) {
        if (key === "name" || key === "children") {
          continue;
        }

        result += this.fieldToTana(key, value, fieldIndent);
      }

      // Output children
      if (children.length > 0) {
        const childIndent = node.name ? indent + 2 : indent;
        result += this.nodesToTana(children, childIndent);
      }
    }

    return result;
  }

  /**
   * Convert field to Tana Paste
   */
  private fieldToTana(key: string, value: any, indent: number): string {
    const spaces = " ".repeat(indent);

    if (typeof value === "string") {
      if (value.includes("```")) {
        // Code block value
        let result = `${spaces}- ${key}::\n`;
        result += this.codeToTana(value, indent + 2);
        return result;
      } else {
        return `${spaces}- ${key}:: ${value}\n`;
      }
    } else if (Array.isArray(value)) {
      // Multi-valued field
      let result = `${spaces}- ${key}::\n`;
      result += this.nodesToTana(value, indent + 2);
      return result;
    } else if (typeof value === "object" && value !== null) {
      // Nested object
      let result = `${spaces}- ${key}::\n`;
      result += this.nodesToTana([value], indent + 2);
      return result;
    } else {
      // Other types (number, boolean, etc.)
      return `${spaces}- ${key}:: ${String(value)}\n`;
    }
  }

  /**
   * Convert code block to Tana Paste format
   */
  private codeToTana(value: string, indent: number): string {
    const spaces = " ".repeat(indent);
    const lines = value.split("\n");
    let result = "";

    for (const line of lines) {
      if (line.length === 0) {
        continue;
      }

      // Count leading spaces in line
      const trimmed = line.trimStart();
      const lineSpaces = line.length - trimmed.length;

      result += `${spaces}${" ".repeat(lineSpaces)}- ${trimmed}\n`;
    }

    return result;
  }
}
