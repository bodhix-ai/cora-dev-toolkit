import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  Organization,
} from "../api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Organization API Client Tests", () => {
  const mockToken = "mock-jwt-token-12345";
  const mockOrgId = "org-uuid-1234-5678";
  const mockApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ==================== GET ORGANIZATIONS TESTS ====================

  describe("getOrganizations", () => {
    const mockOrganizations: Organization[] = [
      {
        id: mockOrgId,
        name: "Test Organization",
        owner_id: "owner-uuid-1234",
        owner_name: "Test Owner",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "org-uuid-5678",
        name: "Another Organization",
        owner_id: "owner-uuid-5678",
        owner_name: "Another Owner",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    it("should fetch organizations successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockOrganizations)),
      });

      const result = await getOrganizations(mockToken);

      expect(mockFetch).toHaveBeenCalledWith(`${mockApiBase}/organizations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(result).toEqual(mockOrganizations);
    });

    it("should fetch organizations with scope parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockOrganizations)),
      });

      const result = await getOrganizations(mockToken, "user");

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/organizations?scope=user`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );

      expect(result).toEqual(mockOrganizations);
    });

    it("should handle empty organizations list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([])),
      });

      const result = await getOrganizations(mockToken);

      expect(result).toEqual([]);
    });

    it("should handle API error responses", async () => {
      const errorResponse = { error: "Unauthorized" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "API Error: Unauthorized"
      );
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "API Error: 500 - Internal Server Error"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "Network Error"
      );
    });

    it("should validate response structure", async () => {
      const validResponse = [
        {
          id: mockOrgId,
          name: "Test Organization",
          owner_id: "owner-uuid-1234",
          owner_name: "Test Owner",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(validResponse)),
      });

      const result = await getOrganizations(mockToken);

      // Verify TypeScript types are preserved
      expect(result[0].id).toBe(mockOrgId);
      expect(result[0].name).toBe("Test Organization");
      expect(result[0].owner_id).toBe("owner-uuid-1234");
      expect(result[0].owner_name).toBe("Test Owner");
    });
  });

  // ==================== GET SINGLE ORGANIZATION TESTS ====================

  describe("getOrganization", () => {
    const mockOrganization: Organization = {
      id: mockOrgId,
      name: "Test Organization",
      owner_id: "owner-uuid-1234",
      owner_name: "Test Owner",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    it("should fetch single organization successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockOrganization)),
      });

      const result = await getOrganization(mockOrgId, mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/organizations/${mockOrgId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );

      expect(result).toEqual(mockOrganization);
    });

    it("should handle organization not found", async () => {
      const errorResponse = { error: "Organization not found" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(getOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: Organization not found"
      );
    });

    it("should handle permission denied", async () => {
      const errorResponse = { error: "Permission denied" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(getOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: Permission denied"
      );
    });

    it("should handle malformed organization ID", async () => {
      const invalidId = "invalid-uuid";
      const errorResponse = { error: "Invalid organization ID format" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(getOrganization(invalidId, mockToken)).rejects.toThrow(
        "API Error: Invalid organization ID format"
      );
    });

    it("should validate single organization response structure", async () => {
      const responseData = {
        id: mockOrgId,
        name: "Test Organization",
        owner_id: "owner-uuid-1234",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
      });

      const result = await getOrganization(mockOrgId, mockToken);

      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe("Test Organization");
      expect(result.owner_id).toBe("owner-uuid-1234");
    });
  });

  // ==================== CREATE ORGANIZATION TESTS ====================

  describe("createOrganization", () => {
    const mockCreatedOrganization: Organization = {
      id: mockOrgId,
      name: "New Test Organization",
      owner_id: "owner-uuid-1234",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    it("should create organization successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(mockCreatedOrganization)),
      });

      const result = await createOrganization(
        "New Test Organization",
        mockToken,
        "owner-uuid-1234"
      );

      expect(mockFetch).toHaveBeenCalledWith(`${mockApiBase}/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          name: "New Test Organization",
          owner_id: "owner-uuid-1234",
        }),
      });

      expect(result).toEqual(mockCreatedOrganization);
    });

    it("should handle missing organization name", async () => {
      const errorResponse = { error: "Organization name is required" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(
        createOrganization("", mockToken, "owner-uuid-1234")
      ).rejects.toThrow("API Error: Organization name is required");
    });

    it("should handle duplicate organization name", async () => {
      const errorResponse = { error: "Organization name already exists" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(
        createOrganization("Existing Org", mockToken, "owner-uuid-1234")
      ).rejects.toThrow("API Error: Organization name already exists");
    });

    it("should handle user provisioning during creation", async () => {
      // Test scenario where user needs to be provisioned in Supabase
      const provisionedOrganization = {
        id: mockOrgId,
        name: "Provisioned Organization",
        owner_id: "newly-provisioned-user-id",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(provisionedOrganization)),
      });

      const result = await createOrganization(
        "Provisioned Organization",
        mockToken,
        "clerk-user-id"
      );

      expect(result.owner_id).toBe("newly-provisioned-user-id");
    });

    it("should validate create response structure", async () => {
      const createResponse = {
        id: mockOrgId,
        name: "Validated Organization",
        owner_id: "owner-uuid-1234",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(createResponse)),
      });

      const result = await createOrganization(
        "Validated Organization",
        mockToken,
        "owner-uuid-1234"
      );

      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe("Validated Organization");
      expect(result.owner_id).toBe("owner-uuid-1234");
    });

    it("should handle organization name edge cases", async () => {
      const edgeCases = [
        "A", // Single character
        "A".repeat(255), // Very long name
        "  Spaced Name  ", // Whitespace
        "Special@#$Characters", // Special characters
        "Unicode: 测试组织 🏢", // Unicode
      ];

      for (const orgName of edgeCases) {
        const responseOrg = {
          id: `org-${Date.now()}`,
          name: orgName.trim(),
          owner_id: "owner-uuid-1234",
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: () => Promise.resolve(JSON.stringify(responseOrg)),
        });

        const result = await createOrganization(
          orgName,
          mockToken,
          "owner-uuid-1234"
        );
        expect(result.name).toBe(orgName.trim());

        jest.clearAllMocks();
      }
    });
  });

  // ==================== UPDATE ORGANIZATION TESTS ====================

  describe("updateOrganization", () => {
    const mockUpdatedOrganization: Organization = {
      id: mockOrgId,
      name: "Updated Organization Name",
      owner_id: "new-owner-uuid-1234",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    };

    it("should update organization successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockUpdatedOrganization)),
      });

      const result = await updateOrganization(
        mockOrgId,
        "Updated Organization Name",
        "new-owner-uuid-1234",
        mockToken
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/organizations/${mockOrgId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            name: "Updated Organization Name",
            owner_id: "new-owner-uuid-1234",
          }),
        }
      );

      expect(result).toEqual(mockUpdatedOrganization);
    });

    it("should handle organization not found during update", async () => {
      const errorResponse = { error: "Organization not found" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(
        updateOrganization(mockOrgId, "Updated Name", "owner-id", mockToken)
      ).rejects.toThrow("API Error: Organization not found");
    });

    it("should handle permission denied during update", async () => {
      const errorResponse = {
        error:
          "Permission denied. Only organization owners can update organization details.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(
        updateOrganization(mockOrgId, "Updated Name", "owner-id", mockToken)
      ).rejects.toThrow(
        "API Error: Permission denied. Only organization owners can update organization details."
      );
    });

    it("should handle invalid update data", async () => {
      const errorResponse = { error: "Invalid organization name" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(
        updateOrganization(mockOrgId, "", "owner-id", mockToken)
      ).rejects.toThrow("API Error: Invalid organization name");
    });

    it("should handle partial updates", async () => {
      // Test updating only name (not owner)
      const partialUpdate = {
        id: mockOrgId,
        name: "Only Name Updated",
        owner_id: "original-owner-id", // Unchanged
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(partialUpdate)),
      });

      const result = await updateOrganization(
        mockOrgId,
        "Only Name Updated",
        "original-owner-id",
        mockToken
      );

      expect(result.name).toBe("Only Name Updated");
      expect(result.owner_id).toBe("original-owner-id");
    });

    it("should validate update response structure", async () => {
      const updateResponse = {
        id: mockOrgId,
        name: "Validated Update",
        owner_id: "owner-uuid-1234",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(updateResponse)),
      });

      const result = await updateOrganization(
        mockOrgId,
        "Validated Update",
        "owner-uuid-1234",
        mockToken
      );

      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe("Validated Update");
      expect(result.owner_id).toBe("owner-uuid-1234");
    });
  });

  // ==================== DELETE ORGANIZATION TESTS ====================

  describe("deleteOrganization", () => {
    it("should delete organization successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });

      await deleteOrganization(mockOrgId, mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/organizations/${mockOrgId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should handle organization not found during delete", async () => {
      const errorResponse = { error: "Organization not found" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(deleteOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: Organization not found"
      );
    });

    it("should handle permission denied during delete", async () => {
      const errorResponse = {
        error:
          "Permission denied. Only organization owners can delete the organization.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(deleteOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: Permission denied. Only organization owners can delete the organization."
      );
    });

    it("should handle organization with dependencies", async () => {
      const errorResponse = {
        error:
          "Cannot delete organization with active projects. Please delete all projects first.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      });

      await expect(deleteOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: Cannot delete organization with active projects. Please delete all projects first."
      );
    });

    it("should handle malformed delete response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(deleteOrganization(mockOrgId, mockToken)).rejects.toThrow(
        "API Error: 500 - Internal Server Error"
      );
    });

    it("should handle successful delete with no content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });

      // Should not throw any errors
      await expect(
        deleteOrganization(mockOrgId, mockToken)
      ).resolves.toBeUndefined();
    });
  });

  // ==================== AUTHENTICATION TESTS ====================

  describe("Authentication and Authorization", () => {
    it("should include proper authorization headers in all requests", async () => {
      const endpoints = [
        () => getOrganizations(mockToken),
        () => getOrganization(mockOrgId, mockToken),
        () => createOrganization("Test", mockToken, "owner-id"),
        () => updateOrganization(mockOrgId, "Test", "owner-id", mockToken),
        () => deleteOrganization(mockOrgId, mockToken),
      ];

      // Mock successful responses for all calls
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({})),
      });

      for (const endpoint of endpoints) {
        await endpoint();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockToken}`,
            }),
          })
        );

        jest.clearAllMocks();
      }
    });

    it("should handle token expiration", async () => {
      const expiredTokenError = { error: "Token expired" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify(expiredTokenError)),
      });

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "API Error: Token expired"
      );
    });

    it("should handle missing token gracefully", async () => {
      const noAuthError = { error: "Authorization header missing" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify(noAuthError)),
      });

      await expect(getOrganizations("")).rejects.toThrow(
        "API Error: Authorization header missing"
      );
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe("Error Handling", () => {
    it("should handle JSON parsing errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Invalid JSON {"),
      });

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "API Error: 500 - Invalid JSON {"
      );
    });

    it("should handle network timeouts", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "Request timeout"
      );
    });

    it("should handle various HTTP status codes", async () => {
      const statusTests = [
        { status: 400, message: "Bad Request" },
        { status: 403, message: "Forbidden" },
        { status: 404, message: "Not Found" },
        { status: 409, message: "Conflict" },
        { status: 429, message: "Too Many Requests" },
        { status: 500, message: "Internal Server Error" },
        { status: 502, message: "Bad Gateway" },
        { status: 503, message: "Service Unavailable" },
      ];

      for (const test of statusTests) {
        const errorResponse = { error: test.message };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: test.status,
          text: () => Promise.resolve(JSON.stringify(errorResponse)),
        });

        await expect(getOrganizations(mockToken)).rejects.toThrow(
          `API Error: ${test.message}`
        );

        jest.clearAllMocks();
      }
    });

    it("should handle empty error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({})),
      });

      await expect(getOrganizations(mockToken)).rejects.toThrow(
        "API Error: Request failed with status 500"
      );
    });
  });

  // ==================== TYPE SAFETY TESTS ====================

  describe("TypeScript Type Safety", () => {
    it("should maintain type safety for Organization objects", async () => {
      const typedOrganization: Organization = {
        id: mockOrgId,
        name: "Typed Organization",
        owner_id: "owner-uuid-1234",
        owner_name: "Typed Owner",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([typedOrganization])),
      });

      const result = await getOrganizations(mockToken);

      // TypeScript should enforce these types
      expect(typeof result[0].id).toBe("string");
      expect(typeof result[0].name).toBe("string");
      expect(typeof result[0].owner_id).toBe("string");

      // Optional field
      if (result[0].owner_name) {
        expect(typeof result[0].owner_name).toBe("string");
      }
    });

    it("should handle optional fields correctly", async () => {
      const organizationWithoutOptionalFields: Organization = {
        id: mockOrgId,
        name: "Minimal Organization",
        owner_id: "owner-uuid-1234",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        // owner_name is optional and omitted
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(JSON.stringify(organizationWithoutOptionalFields)),
      });

      const result = await getOrganization(mockOrgId, mockToken);

      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe("Minimal Organization");
      expect(result.owner_name).toBeUndefined();
    });
  });

  // ==================== INTEGRATION SCENARIO TESTS ====================

  describe("Integration Scenarios", () => {
    it("should handle complete CRUD workflow", async () => {
      const orgName = "CRUD Test Organization";
      const updatedName = "Updated CRUD Test Organization";

      // Create
      const createdOrg = { id: mockOrgId, name: orgName, owner_id: "owner-id" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(createdOrg)),
      });

      const createResult = await createOrganization(
        orgName,
        mockToken,
        "owner-id"
      );
      expect(createResult.name).toBe(orgName);

      // Read
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(createdOrg)),
      });

      const readResult = await getOrganization(mockOrgId, mockToken);
      expect(readResult.id).toBe(mockOrgId);

      // Update
      const updatedOrg = { ...createdOrg, name: updatedName };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(updatedOrg)),
      });

      const updateResult = await updateOrganization(
        mockOrgId,
        updatedName,
        "owner-id",
        mockToken
      );
      expect(updateResult.name).toBe(updatedName);

      // Delete
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });

      await deleteOrganization(mockOrgId, mockToken);

      // Verify all calls were made correctly
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("should handle concurrent organization operations", async () => {
      const orgIds = ["org-1", "org-2", "org-3"];

      // Mock responses for concurrent reads
      orgIds.forEach(() => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: mockOrgId,
                name: "Concurrent Test",
                owner_id: "owner-id",
              })
            ),
        });
      });

      // Make concurrent requests
      const promises = orgIds.map((id) => getOrganization(id, mockToken));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle organization list filtering", async () => {
      const allOrgs = [
        { id: "org-1", name: "Organization A", owner_id: "owner-1" },
        { id: "org-2", name: "Organization B", owner_id: "owner-2" },
      ];

      const userOrgs = [allOrgs[0]]; // User only has access to first org

      // Test without scope (all accessible organizations)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(allOrgs)),
      });

      const allResults = await getOrganizations(mockToken);
      expect(allResults).toHaveLength(2);

      // Test with user scope
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(userOrgs)),
      });

      const userResults = await getOrganizations(mockToken, "user");
      expect(userResults).toHaveLength(1);
      expect(userResults[0].id).toBe("org-1");
    });
  });
});
