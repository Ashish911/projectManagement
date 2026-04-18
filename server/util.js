export const removeObject = (id) => {
  let editedId = id.toString().replace('new ObjectId("', "");
  return editedId.replace('")', "");
};

// export const transform = (doc) => {
//   if (!doc) return null;
//   const obj = doc.toObject(); // ✅ triggers your schema transform
//   return obj;
// };
