/**
 * Frontend API tests for Projects API client functions.
 * Tests TypeScript validation, error handling, and API integration patterns.
 */

// Mock faker-js to avoid ES module issues
const faker = {
  string: {
    uuid: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
    alpha: (options?: any) => "test-string",
  },
  company: {
    name: () => "Test Company",
  },
  lorem: {
    paragraph: () => "Test description paragraph",
    paragraphs: (count?: number) =>
      "Test long description with multiple paragraphs. ".repeat(count || 3),
  },
  person: {
    fullName: () => "Test User",
  },
  internet: {
    email: () => "test@example.com",
  },
};

// Import the API functions to test
import {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  type Project,
  type ProjectMember,
} from "../api";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Projects API Client Tests", () => {
  const TEST_TOKEN = "test-jwt-token-12345";
  const TEST_ORG_ID = "org-test-123";
  const TEST_PROJECT_ID = "proj-test-456";
  const TEST_USER_ID = "user-test-789";
  const TEST_MEMBER_ID = "member-test-101";

  // Mock project data
  const mockProject: Project = {
    id: TEST_PROJECT_ID,
    name: "Test Project",
    description: "A test project for API testing",
    org_id: TEST_ORG_ID,
    owner_id: TEST_USER_ID,
    created_at: "2025-09-26T20:00:00Z",
    updated_at: "2025-09-26T20:00:00Z",
  };

  const mockProjectMember: ProjectMember = {
    project_id: TEST_PROJECT_ID,
    user_id: TEST_USER_ID,
    role: "project_admin",
    profile: {
      full_name: "Test User",
      email: "test@example.com",
      avatar_url: "https://example.com/avatar.jpg",
    },
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  // === PROJECT LISTING TESTS ===

  describe("getProjects", () => {
    it("should successfully fetch projects with organization ID", async () => {
      const mockResponse = [mockProject];
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await getProjects(TEST_TOKEN, TEST_ORG_ID);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects?org_id=org-test-123",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-jwt-token-12345",
          },
        }
      );

      expect(result).toEqual(mockResponse);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe("Test Project");
    });

    it("should handle network error in getProjects", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "Network error"
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle API error response in getProjects", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('{"error": "Forbidden"}'),
      });

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "API Error: 403 - "
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle malformed JSON response in getProjects", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("invalid-json-response"),
      });

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "Failed to parse API response"
      );
    });

    it("should handle empty projects list", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("[]"),
      });

      const result = await getProjects(TEST_TOKEN, TEST_ORG_ID);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  // === PROJECT CREATION TESTS ===

  describe("createProject", () => {
    it("should successfully create a project", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockProject)),
      });

      const result = await createProject(
        "New Test Project",
        "Project description",
        TEST_TOKEN,
        TEST_ORG_ID
      );

      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-jwt-token-12345",
        },
        body: JSON.stringify({
          name: "New Test Project",
          description: "Project description",
          org_id: TEST_ORG_ID,
        }),
      });

      expect(result).toEqual(mockProject);
      expect(result.name).toBe("Test Project");
      expect(result.org_id).toBe(TEST_ORG_ID);
    });

    it("should handle validation error in createProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('{"error": "Name is required"}'),
      });

      await expect(
        createProject("", "Description", TEST_TOKEN, TEST_ORG_ID)
      ).rejects.toThrow("API Error: 400 -");
    });

    it("should handle unauthorized error in createProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('{"error": "Unauthorized"}'),
      });

      await expect(
        createProject(
          "Test Project",
          "Description",
          "invalid-token",
          TEST_ORG_ID
        )
      ).rejects.toThrow("API Error: 401 -");
    });

    it("should handle Unicode characters in project name", async () => {
      const unicodeProject = {
        ...mockProject,
        name: "测试项目 🚀 Тест Проект",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(unicodeProject)),
      });

      const result = await createProject(
        "测试项目 🚀 Тест Проект",
        "Unicode test project",
        TEST_TOKEN,
        TEST_ORG_ID
      );

      expect(result.name).toBe("测试项目 🚀 Тест Проект");
    });
  });

  // === PROJECT RETRIEVAL TESTS ===

  describe("getProject", () => {
    it("should successfully fetch a single project", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockProject)),
      });

      const result = await getProject(TEST_PROJECT_ID, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-jwt-token-12345",
          },
        }
      );

      expect(result).toEqual(mockProject);
      expect(result.id).toBe(TEST_PROJECT_ID);
    });

    it("should handle project not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('{"error": "Project not found"}'),
      });

      await expect(getProject("nonexistent-id", TEST_TOKEN)).rejects.toThrow(
        "API Error: 404 -"
      );
    });

    it("should handle server error in getProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('{"error": "Internal server error"}'),
      });

      await expect(getProject(TEST_PROJECT_ID, TEST_TOKEN)).rejects.toThrow(
        "API Error: 500 -"
      );
    });
  });

  // === PROJECT UPDATE TESTS ===

  describe("updateProject", () => {
    it("should successfully update project with partial data", async () => {
      const updatedProject = { ...mockProject, name: "Updated Project Name" };
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(updatedProject)),
      });

      const result = await updateProject(
        TEST_PROJECT_ID,
        { name: "Updated Project Name" },
        TEST_TOKEN
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-jwt-token-12345",
          },
          body: JSON.stringify({ name: "Updated Project Name" }),
        }
      );

      expect(result.name).toBe("Updated Project Name");
    });

    it("should successfully update project description only", async () => {
      const updatedProject = { ...mockProject, description: "New description" };
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(updatedProject)),
      });

      const result = await updateProject(
        TEST_PROJECT_ID,
        { description: "New description" },
        TEST_TOKEN
      );

      expect(result.description).toBe("New description");
      expect(result.name).toBe("Test Project"); // Should remain unchanged
    });

    it("should handle validation error in updateProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('{"error": "Name cannot be empty"}'),
      });

      await expect(
        updateProject(TEST_PROJECT_ID, { name: "" }, TEST_TOKEN)
      ).rejects.toThrow("API Error: 400 -");
    });

    it("should handle project not found in updateProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('{"error": "Project not found"}'),
      });

      await expect(
        updateProject("nonexistent-id", { name: "New Name" }, TEST_TOKEN)
      ).rejects.toThrow("API Error: 404 -");
    });
  });

  // === PROJECT DELETION TESTS ===

  describe("deleteProject", () => {
    it("should successfully delete a project", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      });

      await deleteProject(TEST_PROJECT_ID, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer test-jwt-token-12345",
          },
        }
      );
    });

    it("should handle project not found in deleteProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('{"error": "Project not found"}'),
      });

      await expect(deleteProject("nonexistent-id", TEST_TOKEN)).rejects.toThrow(
        "API Error: 404 -"
      );
    });

    it("should handle permission error in deleteProject", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('{"error": "Permission denied"}'),
      });

      await expect(deleteProject(TEST_PROJECT_ID, TEST_TOKEN)).rejects.toThrow(
        "API Error: 403 -"
      );
    });
  });

  // === PROJECT MEMBER MANAGEMENT TESTS ===

  describe("getProjectMembers", () => {
    it("should successfully fetch project members", async () => {
      const mockMembers = [mockProjectMember];
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockMembers)),
      });

      const result = await getProjectMembers(TEST_PROJECT_ID, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}/members`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-jwt-token-12345",
          },
        }
      );

      expect(result).toEqual(mockMembers);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].role).toBe("project_admin");
    });

    it("should handle empty members list", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("[]"),
      });

      const result = await getProjectMembers(TEST_PROJECT_ID, TEST_TOKEN);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle project not found in getProjectMembers", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('{"error": "Project not found"}'),
      });

      await expect(
        getProjectMembers("nonexistent-id", TEST_TOKEN)
      ).rejects.toThrow("Failed to parse API response:");
    });
  });

  describe("addProjectMember", () => {
    it("should successfully add a project member", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockProjectMember)),
      });

      const result = await addProjectMember(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        "project_member",
        TEST_TOKEN
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-jwt-token-12345",
          },
          body: JSON.stringify({
            user_id: TEST_USER_ID,
            role: "project_member",
          }),
        }
      );

      expect(result).toEqual(mockProjectMember);
    });

    it("should handle duplicate member error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest
          .fn()
          .mockResolvedValue(
            '{"error": "User is already a member of this project"}'
          ),
      });

      await expect(
        addProjectMember(
          TEST_PROJECT_ID,
          TEST_USER_ID,
          "project_member",
          TEST_TOKEN
        )
      ).rejects.toThrow("Failed to parse API response:");
    });

    it("should handle invalid role error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest
          .fn()
          .mockResolvedValue('{"error": "Invalid role specified"}'),
      });

      await expect(
        addProjectMember(
          TEST_PROJECT_ID,
          TEST_USER_ID,
          "invalid_role",
          TEST_TOKEN
        )
      ).rejects.toThrow("Failed to parse API response:");
    });
  });

  describe("removeProjectMember", () => {
    it("should successfully remove a project member", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      });

      await removeProjectMember(TEST_PROJECT_ID, TEST_MEMBER_ID, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${TEST_PROJECT_ID}/members/${TEST_MEMBER_ID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer test-jwt-token-12345",
          },
        }
      );
    });

    it("should handle member not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('{"error": "Member not found"}'),
      });

      await expect(
        removeProjectMember(TEST_PROJECT_ID, "nonexistent-member", TEST_TOKEN)
      ).rejects.toThrow("API Error: 404 -");
    });

    it("should handle permission error in removeProjectMember", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest
          .fn()
          .mockResolvedValue(
            '{"error": "Only project admins can remove members"}'
          ),
      });

      await expect(
        removeProjectMember(TEST_PROJECT_ID, TEST_MEMBER_ID, TEST_TOKEN)
      ).rejects.toThrow("API Error: 403 -");
    });
  });

  // === ERROR HANDLING AND EDGE CASES ===

  describe("Error Handling", () => {
    it("should handle network timeout errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "Network timeout"
      );
      await expect(
        createProject("Test", "Desc", TEST_TOKEN, TEST_ORG_ID)
      ).rejects.toThrow("Network timeout");
      await expect(getProject(TEST_PROJECT_ID, TEST_TOKEN)).rejects.toThrow(
        "Network timeout"
      );
      await expect(
        updateProject(TEST_PROJECT_ID, { name: "New" }, TEST_TOKEN)
      ).rejects.toThrow("Network timeout");
      await expect(deleteProject(TEST_PROJECT_ID, TEST_TOKEN)).rejects.toThrow(
        "Network timeout"
      );
    });

    it("should handle server errors (500)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('{"error": "Internal server error"}'),
      });

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "API Error: 500 -"
      );
    });

    it("should handle malformed error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue("invalid-error-json"),
      });

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "API Error: 400 - invalid-error-json"
      );
    });

    it("should handle empty error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue(""),
      });

      await expect(getProjects(TEST_TOKEN, TEST_ORG_ID)).rejects.toThrow(
        "API Error: 400 - "
      );
    });
  });

  // === INPUT VALIDATION TESTS ===

  describe("Input Validation", () => {
    it("should handle special characters in project names", async () => {
      const specialProject = { ...mockProject, name: "Project with @#$%^&*()" };
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(specialProject)),
      });

      const result = await createProject(
        "Project with @#$%^&*()",
        "Desc",
        TEST_TOKEN,
        TEST_ORG_ID
      );
      expect(result.name).toBe("Project with @#$%^&*()");
    });

    it("should handle very long project descriptions", async () => {
      const longDescription = faker.lorem.paragraphs(10);
      const longDescProject = { ...mockProject, description: longDescription };

      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(longDescProject)),
      });

      const result = await createProject(
        "Test",
        longDescription,
        TEST_TOKEN,
        TEST_ORG_ID
      );
      expect(result.description).toBe(longDescription);
    });

    it("should handle empty string inputs gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('{"error": "Name cannot be empty"}'),
      });

      await expect(
        createProject("", "", TEST_TOKEN, TEST_ORG_ID)
      ).rejects.toThrow("API Error: 400 -");
    });
  });

  // === AUTHENTICATION AND AUTHORIZATION TESTS ===

  describe("Authentication and Authorization", () => {
    it("should handle expired token errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('{"error": "Token expired"}'),
      });

      await expect(getProjects("expired-token", TEST_ORG_ID)).rejects.toThrow(
        "API Error: 401 -"
      );
    });

    it("should handle insufficient permissions", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest
          .fn()
          .mockResolvedValue('{"error": "Insufficient permissions"}'),
      });

      await expect(deleteProject(TEST_PROJECT_ID, TEST_TOKEN)).rejects.toThrow(
        "API Error: 403 -"
      );
    });

    it("should include Bearer prefix in Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("[]"),
      });

      await getProjects(TEST_TOKEN, TEST_ORG_ID);

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      expect(authHeader).toBe(`Bearer ${TEST_TOKEN}`);
    });
  });

  // === CONTENT TYPE AND HEADERS TESTS ===

  describe("HTTP Headers and Content Types", () => {
    it("should set correct Content-Type for POST requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockProject)),
      });

      await createProject("Test", "Desc", TEST_TOKEN, TEST_ORG_ID);

      const contentType = mockFetch.mock.calls[0][1].headers["Content-Type"];
      expect(contentType).toBe("application/json");
    });

    it("should set correct Content-Type for PATCH requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockProject)),
      });

      await updateProject(TEST_PROJECT_ID, { name: "Updated" }, TEST_TOKEN);

      const contentType = mockFetch.mock.calls[0][1].headers["Content-Type"];
      expect(contentType).toBe("application/json");
    });

    it("should not set Content-Type for GET requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("[]"),
      });

      await getProjects(TEST_TOKEN, TEST_ORG_ID);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("should not set Content-Type for DELETE requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      });

      await deleteProject(TEST_PROJECT_ID, TEST_TOKEN);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Content-Type"]).toBeUndefined();
    });
  });
});
