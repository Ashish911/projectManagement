export const removeObject = (id) => {
  let editedId = id.toString().replace('new ObjectId("', "");
  return editedId.replace('")', "");
};
