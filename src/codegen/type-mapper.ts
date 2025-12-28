/**
 * T-1.3: Type Mapper
 *
 * Maps Tana DataTypes to Effect Schema type expressions.
 */

import type { DataType } from "../utils/infer-data-type";

/**
 * Optional strategy options.
 */
export type OptionalStrategy = "option" | "undefined" | "nullable";

/**
 * Options for mapping a data type.
 */
export interface TypeMappingOptions {
  /** Whether the field is optional */
  isOptional?: boolean;

  /** How to wrap optional fields */
  optionalStrategy?: OptionalStrategy;
}

/**
 * URL validation pattern for Effect Schema.
 */
const URL_PATTERN = '/^https?:\\/\\//';

/**
 * Email validation pattern for Effect Schema.
 * Simple pattern - validates basic email structure.
 */
const EMAIL_PATTERN = '/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/';

/**
 * Get the base Effect Schema type for a Tana DataType.
 * Does not include optional wrapping.
 *
 * @param dataType - Tana data type
 * @returns Effect Schema type expression
 */
export function getBaseEffectType(dataType: DataType | null | undefined): string {
  switch (dataType) {
    case "text":
      return "Schema.String";

    case "number":
      return "Schema.Number";

    case "date":
      return "Schema.DateFromString";

    case "checkbox":
      return "Schema.Boolean";

    case "url":
      return `Schema.String.pipe(Schema.pattern(${URL_PATTERN}))`;

    case "email":
      return `Schema.String.pipe(Schema.pattern(${EMAIL_PATTERN}))`;

    case "reference":
      // Reference is a node ID - just a string
      return "Schema.String";

    case "options":
      // Without knowing the specific options, default to string
      // In future, could generate Schema.Union(Schema.Literal(...))
      return "Schema.String";

    default:
      // Unknown or null type - default to string
      return "Schema.String";
  }
}

/**
 * Wrap a type expression with optional handling.
 *
 * @param typeExpr - Base type expression (e.g., "Schema.String")
 * @param strategy - Optional strategy to use
 * @returns Wrapped type expression
 */
export function wrapOptional(typeExpr: string, strategy: OptionalStrategy): string {
  switch (strategy) {
    case "option":
      return `Schema.optionalWith(${typeExpr}, { as: "Option" })`;

    case "undefined":
      return `Schema.optional(${typeExpr})`;

    case "nullable":
      return `Schema.NullOr(${typeExpr})`;

    default:
      return `Schema.optionalWith(${typeExpr}, { as: "Option" })`;
  }
}

/**
 * Map a Tana DataType to an Effect Schema type expression.
 *
 * @param dataType - Tana data type
 * @param options - Mapping options (optional, strategy)
 * @returns Complete Effect Schema type expression
 */
export function mapDataTypeToEffect(
  dataType: DataType | null | undefined,
  options: TypeMappingOptions = {}
): string {
  const { isOptional = false, optionalStrategy = "option" } = options;

  const baseType = getBaseEffectType(dataType);

  if (isOptional) {
    return wrapOptional(baseType, optionalStrategy);
  }

  return baseType;
}
