import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const optionalUuidSchema = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data in formato YYYY-MM-DD")
  .or(z.literal("").transform(() => undefined))
  .optional();

export function emptyToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);
}
