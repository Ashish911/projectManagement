import { ValidationError } from "../errors/import.error.js";

export const validate = (schema, data) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");

    console.log("Validation error message:", message);
    throw new ValidationError(message);
  }

  return result.data;
};
