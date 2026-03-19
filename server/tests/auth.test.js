import { ApolloServer } from "@apollo/server";
import { executeOperation } from "@apollo/server";
import { createServer } from "../server.js";

let server;

beforeAll(async () => {
    server = await createServer();
    await server.start();
});

afterAll(async () => {
    await server.stop();
});

describe("🔴 Auth - Register", () => {
    it("should register a new user", async () => {
        const res = await server.executeOperation({
            query: `
                mutation RegisterMutation {
                    register(
                        name: "Test User"
                        email: "test@example.com"
                        password: "password123"
                        number: "1234567890"
                        dob: "1990-01-01"
                    ) {
                        id
                        name
                        email
                    }
                }
            `
        });

        expect(res.body.singleResult.errors).toBeUndefined();
        expect(res.body.singleResult.data.register.email).toBe("test@example.com");
    });
});

describe("🔴 Auth - Login", () => {
    it("should login and return a token", async () => {
        const res = await server.executeOperation({
            query: `
                mutation LoginMutation {
                    login(
                        email: "test@example.com"
                        password: "password123"
                    ) {
                        token
                    }
                }
            `
        });

        expect(res.body.singleResult.errors).toBeUndefined();
        expect(res.body.singleResult.data.login.token).toBeDefined();
    });

    it("should fail with wrong password", async () => {
        const res = await server.executeOperation({
            query: `
                mutation LoginMutation {
                    login(
                        email: "test@example.com"
                        password: "wrongpassword"
                    ) {
                        token
                    }
                }
            `
        });

        expect(res.body.singleResult.errors).toBeDefined();
    });
});

describe("🔴 Auth - Protected Routes", () => {
    it("should reject request without token", async () => {
        const res = await server.executeOperation({
            query: `query { projects { id } }`
        });

        expect(res.body.singleResult.errors).toBeDefined();
        expect(res.body.singleResult.errors[0].message).toBe(
            "Authorization required. Please provide a Bearer token."
        );
    });
});