// tests/graphqlTypes.test.js — GraphQL output types match what the models can actually hold
import { GraphQLNonNull } from "graphql";

const { ClientType } = await import("../graphql/types/client.type.js");

describe("ClientType", () => {
  it.each(["email", "phone"])(
    "🔴 %s is nullable, because clients may be created without it",
    (field) => {
      const type = ClientType.getFields()[field].type;
      expect(type instanceof GraphQLNonNull).toBe(false);
    },
  );

  it("🟢 name stays required", () => {
    expect(ClientType.getFields().name.type instanceof GraphQLNonNull).toBe(true);
  });
});
