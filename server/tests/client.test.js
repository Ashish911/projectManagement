// tests/client.service.test.js
import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockClientFind = jest.fn();
const mockClientFindById = jest.fn();
const mockClientFindByEmail = jest.fn();
const mockClientFindByUser = jest.fn();
const mockClientCreate = jest.fn();
const mockClientUpdate = jest.fn();
const mockClientDelete = jest.fn();

const mockUserFindById = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/client.repo.js", () => ({
  ClientRepo: {
    find: mockClientFind,
    findById: mockClientFindById,
    findByEmail: mockClientFindByEmail,
    findByUser: mockClientFindByUser,
    create: mockClientCreate,
    update: mockClientUpdate,
    delete: mockClientDelete,
  },
}));

jest.unstable_mockModule("../repositories/user.repo.js", () => ({
  UserRepo: {
    findById: mockUserFindById,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { ClientService } = await import("../services/client.service.js");

// ─── Mock Data ────────────────────────────────────────────────────
const mockSuperAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d0f",
  role: "SUPER_ADMIN",
};

const mockClientAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d1a",
  role: "CLIENT_ADMIN",
};

const mockUser = {
  id: "648a1b2c3d4e5f6a7b8c9d0e",
  role: "USER",
};

const mockClient = {
  _id: "748a1b2c3d4e5f6a7b8c9d0e",
  name: "Test Client",
  email: "client@example.com",
  phone: "1234567890",
  assignedAdmin: "648a1b2c3d4e5f6a7b8c9d1a",
  deleteRequest: false,
};

const addClientData = {
  name: "New Client",
  email: "newclient@example.com",
  phone: "0987654321",
  user: "648a1b2c3d4e5f6a7b8c9d1a",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("ClientService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // GET CLIENTS
  // ════════════════════════════════════════════════════════════════
  describe("getClients", () => {
    it("🟢 SUPER_ADMIN should get all clients", async () => {
      mockClientFind.mockResolvedValue([mockClient]);

      const result = await ClientService.getClients({ user: mockSuperAdmin });

      expect(result).toEqual([mockClient]);
      expect(mockClientFind).toHaveBeenCalled();
    });

    it("🔴 CLIENT_ADMIN should not get all clients", async () => {
      await expect(
        ClientService.getClients({ user: mockClientAdmin }),
      ).rejects.toThrow(
        "Current role does not have the permission to get Clients",
      );
    });

    it("🔴 USER should not get all clients", async () => {
      await expect(
        ClientService.getClients({ user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to get Clients",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET CLIENT
  // ════════════════════════════════════════════════════════════════
  describe("getClient", () => {
    it("🟢 SUPER_ADMIN should get any client", async () => {
      mockClientFindById.mockResolvedValue(mockClient);

      const result = await ClientService.getClient(mockClient._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual(mockClient);
    });

    it("🟢 CLIENT_ADMIN should get their assigned client", async () => {
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: { id: mockClientAdmin.id },
      });

      const result = await ClientService.getClient(mockClient._id, {
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
    });

    it("🔴 CLIENT_ADMIN should not get a client they are not assigned to", async () => {
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: { id: "differentadmin123" },
      });

      await expect(
        ClientService.getClient(mockClient._id, { user: mockClientAdmin }),
      ).rejects.toThrow("You are not assigned to this client");
    });

    it("🔴 USER should not get any client", async () => {
      mockClientFindById.mockResolvedValue(mockClient);

      await expect(
        ClientService.getClient(mockClient._id, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to get Client",
      );
    });

    it("🔴 should throw if client not found", async () => {
      mockClientFindById.mockResolvedValue(null);

      await expect(
        ClientService.getClient("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Client not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADD CLIENT
  // ════════════════════════════════════════════════════════════════
  describe("addClient", () => {
    // it("🟢 SUPER_ADMIN should add a client successfully", async () => {
    //   mockClientFindByEmail.mockResolvedValue(null);
    //   mockUserFindById.mockResolvedValue(mockClientAdmin);
    //   mockClientFindByUser.mockResolvedValue(null);
    //   mockClientCreate.mockResolvedValue({
    //     ...addClientData,
    //     _id: "748a1b2c3d4e5f6a7b8c9d1b",
    //   });
    //   const result = await ClientService.addClient(addClientData, {
    //     user: mockSuperAdmin,
    //   });
    //   expect(result._id).toBeDefined();
    //   expect(mockClientCreate).toHaveBeenCalled();
    // });
    // it("🔴 CLIENT_ADMIN should not add a client", async () => {
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockClientAdmin }),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to add Clients",
    //   );
    // });
    // it("🔴 USER should not add a client", async () => {
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockUser }),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to add Clients",
    //   );
    // });
    // it("🔴 should throw if email already exists", async () => {
    //   mockClientFindByEmail.mockResolvedValue(mockClient);
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockSuperAdmin }),
    //   ).rejects.toThrow("Client with this email already exists");
    // });
    // it("🔴 should throw if assigned user not found", async () => {
    //   mockClientFindByEmail.mockResolvedValue(null);
    //   mockUserFindById.mockResolvedValue(null);
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockSuperAdmin }),
    //   ).rejects.toThrow("User not found");
    // });
    // it("🔴 should throw if assigned user is not CLIENT_ADMIN", async () => {
    //   mockClientFindByEmail.mockResolvedValue(null);
    //   mockUserFindById.mockResolvedValue(mockUser); // USER role not CLIENT_ADMIN
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockSuperAdmin }),
    //   ).rejects.toThrow("Only CLIENT_ADMIN users can be assigned to a client");
    // });
    // it("🔴 should throw if user is already assigned to another client", async () => {
    //   mockClientFindByEmail.mockResolvedValue(null);
    //   mockUserFindById.mockResolvedValue(mockClientAdmin);
    //   mockClientFindByUser.mockResolvedValue(mockClient); // already assigned
    //   await expect(
    //     ClientService.addClient(addClientData, { user: mockSuperAdmin }),
    //   ).rejects.toThrow("User is already assigned to a client");
    // });
    // it("🔴 should not call create if email already exists", async () => {
    //   mockClientFindByEmail.mockResolvedValue(mockClient);
    //   try {
    //     await ClientService.addClient(addClientData, { user: mockSuperAdmin });
    //   } catch (e) {}
    //   expect(mockClientCreate).not.toHaveBeenCalled();
    // });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE CLIENT
  // ════════════════════════════════════════════════════════════════
  describe("updateClient", () => {
    const updateData = {
      id: "748a1b2c3d4e5f6a7b8c9d0e",
      name: "Updated Client",
      email: "updated@example.com",
      phone: "1111111111",
    };

    // it("🟢 SUPER_ADMIN should update any client", async () => {
    //   mockClientFindById.mockResolvedValue(mockClient);
    //   mockClientUpdate.mockResolvedValue({ ...mockClient, ...updateData });

    //   const result = await ClientService.updateClient(updateData, {
    //     user: mockSuperAdmin,
    //   });

    //   expect(result.name).toBe("Updated Client");
    //   expect(mockClientUpdate).toHaveBeenCalled();
    // });

    // it("🟢 CLIENT_ADMIN should update their assigned client", async () => {
    //   mockClientFindById.mockResolvedValue({
    //     ...mockClient,
    //     assignedAdmin: mockClientAdmin.id,
    //   });
    //   mockClientUpdate.mockResolvedValue({ ...mockClient, ...updateData });

    //   const result = await ClientService.updateClient(updateData, {
    //     user: mockClientAdmin,
    //   });

    //   expect(result).toBeDefined();
    // });

    // it("🔴 USER should not update a client", async () => {
    //   await expect(
    //     ClientService.updateClient(updateData, { user: mockUser }),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to update Clients",
    //   );
    // });

    // it("🔴 should throw if client not found", async () => {
    //   mockClientFindById.mockResolvedValue(null);

    //   await expect(
    //     ClientService.updateClient(updateData, { user: mockSuperAdmin }),
    //   ).rejects.toThrow("Client not found");
    // });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE CLIENT REQUEST
  // ════════════════════════════════════════════════════════════════
  describe("deleteClientRequest", () => {
    // it("🟢 SUPER_ADMIN should be able to request client deletion", async () => {
    //   mockClientUpdate.mockResolvedValue({
    //     ...mockClient,
    //     deleteRequest: true,
    //   });
    //   const result = await ClientService.deleteClientRequest(
    //     { id: mockClient._id },
    //     { user: mockSuperAdmin },
    //   );
    //   expect(mockClientUpdate).toHaveBeenCalledWith(mockClient._id, {
    //     deleteRequest: true,
    //   });
    // });
    // it("🟢 CLIENT_ADMIN should be able to request client deletion", async () => {
    //   mockClientUpdate.mockResolvedValue({
    //     ...mockClient,
    //     deleteRequest: true,
    //   });
    //   const result = await ClientService.deleteClientRequest(
    //     { id: mockClient._id },
    //     { user: mockClientAdmin },
    //   );
    //   expect(mockClientUpdate).toHaveBeenCalled();
    // });
    // it("🔴 USER should not be able to request client deletion", async () => {
    //   await expect(
    //     ClientService.deleteClientRequest(
    //       { id: mockClient._id },
    //       { user: mockUser },
    //     ),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to request client deletion",
    //   );
    // });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE CLIENT BY SUPER ADMIN
  // ════════════════════════════════════════════════════════════════
  describe("deleteClientBySuperAdmin", () => {
    // it("🟢 SUPER_ADMIN should delete a client", async () => {
    //   mockClientFindById.mockResolvedValue(mockClient);
    //   mockClientDelete.mockResolvedValue(mockClient);
    //   const result = await ClientService.deleteClientBySuperAdmin(
    //     { id: mockClient._id },
    //     { user: mockSuperAdmin },
    //   );
    //   expect(result).toEqual(mockClient);
    //   expect(mockClientDelete).toHaveBeenCalledWith(mockClient._id);
    // });
    // it("🔴 CLIENT_ADMIN should not delete a client", async () => {
    //   await expect(
    //     ClientService.deleteClientBySuperAdmin(
    //       { id: mockClient._id },
    //       { user: mockClientAdmin },
    //     ),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to delete Clients",
    //   );
    // });
    // it("🔴 USER should not delete a client", async () => {
    //   await expect(
    //     ClientService.deleteClientBySuperAdmin(
    //       { id: mockClient._id },
    //       { user: mockUser },
    //     ),
    //   ).rejects.toThrow(
    //     "Current role does not have the permission to delete Clients",
    //   );
    // });
    // it("🔴 should throw if client not found", async () => {
    //   mockClientFindById.mockResolvedValue(null);
    //   await expect(
    //     ClientService.deleteClientBySuperAdmin(
    //       { id: mockClient._id },
    //       { user: mockSuperAdmin },
    //     ),
    //   ).rejects.toThrow("Client not found");
    // });
    // it("🔴 should not call delete if client not found", async () => {
    //   mockClientFindById.mockResolvedValue(null);
    //   try {
    //     await ClientService.deleteClientBySuperAdmin(
    //       { id: mockClient._id },
    //       { user: mockSuperAdmin },
    //     );
    //   } catch (e) {}
    //   expect(mockClientDelete).not.toHaveBeenCalled();
    // });
  });
});
