export const removeObject = (id) => {
  let editedId = id.toString().replace('new ObjectId("', "");
  return editedId.replace('")', "");
};

// Success handler
export const gqlResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
});

// Error handler
export const gqlError = (message = "Error") => {
  throw new Error(message); // GraphQL will catch this
};