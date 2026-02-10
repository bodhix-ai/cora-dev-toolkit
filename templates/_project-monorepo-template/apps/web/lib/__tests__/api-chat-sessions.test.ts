import {
  listChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  listKnowledgeBases,
  createKnowledgeBase,
  ChatSession,
  ChatSessionMessage,
  KnowledgeBase,
} from "../api";

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Helper function to create proper Response mocks
const createMockResponse = (
  data: any,
  options: { ok?: boolean; status?: number; headers?: Headers } = {}
) => {
  const {
    ok = true,
    status = 200,
    headers = new Headers({ "content-type": "application/json" }),
  } = options;
  const responseText = typeof data === "string" ? data : JSON.stringify(data);

  // Handle empty strings and non-JSON data
  let jsonData = data;
  if (typeof data === "string") {
    if (data === "") {
      jsonData = null; // Empty response
    } else {
      try {
        jsonData = JSON.parse(data);
      } catch {
        jsonData = data; // Return as-is if not valid JSON
      }
    }
  }

  return {
    ok,
    status,
    headers,
    text: jest.fn().mockResolvedValue(responseText),
    json: jest.fn().mockResolvedValue(jsonData),
  } as unknown as Response;
};

describe("Chat Sessions API Client", () => {
  const mockSessionId = "test-session-id";
  const mockOrgId = "test-org-id";
  const mockProjectId = "test-project-id";
  const mockKbId = "test-kb-id";
  const mockToken = "test-jwt-token";

  beforeEach(() => {
    mockFetch.mockClear();
  });

  // ==================== LIST CHAT SESSIONS TESTS ====================

  describe("listChatSessions", () => {
    it("should list chat sessions successfully", async () => {
      const mockResponse = {
        sessions: [
          {
            id: mockSessionId,
            title: "Test Session",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            org_id: mockOrgId,
            project_id: null,
            context_type: "user",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        filters: {
          org_id: mockOrgId,
          context_type: "all",
          search: "",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
        json: jest.fn().mockResolvedValue(mockResponse),
      } as unknown as Response);

      const result = await listChatSessions(mockToken, {
        org_id: mockOrgId,
        context_type: "all",
        limit: 20,
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].id).toBe(mockSessionId);
      expect(result.total).toBe(1);
      expect(result.filters?.org_id).toBe(mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/sessions"),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should handle search parameter", async () => {
      const mockResponse = {
        sessions: [],
        total: 0,
        limit: 20,
        offset: 0,
        filters: { search: "policy document" },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await listChatSessions(mockToken, {
        org_id: mockOrgId,
        search: "policy document",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=policy"),
        expect.any(Object)
      );
    });

    it("should handle pagination parameters", async () => {
      const mockResponse = {
        sessions: [],
        total: 50,
        limit: 10,
        offset: 20,
        filters: {},
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await listChatSessions(mockToken, {
        org_id: mockOrgId,
        limit: 10,
        offset: 20,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10&offset=20"),
        expect.any(Object)
      );
    });

    it("should handle context_type filtering", async () => {
      const mockResponse = {
        sessions: [],
        total: 0,
        limit: 20,
        offset: 0,
        filters: { context_type: "project" },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await listChatSessions(mockToken, {
        org_id: mockOrgId,
        context_type: "project",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("context_type=project"),
        expect.any(Object)
      );
    });

    it("should handle 401 Unauthorized error", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Unauthorized" },
          { ok: false, status: 401 }
        )
      );

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        'API Error: 401 - {"error":"Unauthorized"}'
      );
    });

    it("should handle 500 server error", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Internal server error" },
          { ok: false, status: 500 }
        )
      );

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        'API Error: 500 - {"error":"Internal server error"}'
      );
    });

    it("should handle network timeout", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        "Network timeout"
      );
    });

    it("should handle missing token", async () => {
      await expect(listChatSessions("")).rejects.toThrow();
    });

    it("should handle empty response", async () => {
      const mockResponse = {
        sessions: [],
        total: 0,
        limit: 20,
        offset: 0,
        filters: {},
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await listChatSessions(mockToken);
      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: jest.fn().mockResolvedValue("invalid json"),
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as unknown as Response);

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        "Failed to parse API response: invalid json"
      );
    });
  });

  // ==================== GET CHAT SESSION TESTS ====================

  describe("getChatSession", () => {
    it("should get chat session successfully", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "Test Session",
        created_by: "user-id",
        org_id: mockOrgId,
        project_id: null,
        created_at: "2024-01-01T00:00:00Z",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Hello",
            metadata: { token_count: 5 },
            created_at: "2024-01-01T00:01:00Z",
          },
          {
            id: "msg-2",
            role: "assistant",
            content: "Hi there! How can I help you?",
            metadata: { token_count: 12 },
            created_at: "2024-01-01T00:02:00Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await getChatSession(mockSessionId, mockToken);

      expect(result.id).toBe(mockSessionId);
      expect(result.title).toBe("Test Session");
      expect(result.messages?.length).toBe(2);
      expect(result.messages?.[0].role).toBe("user");
      expect(result.messages?.[1].role).toBe("assistant");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/chat/sessions/${mockSessionId}`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should handle 404 session not found", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Session not found" },
          { ok: false, status: 404 }
        )
      );

      await expect(getChatSession(mockSessionId, mockToken)).rejects.toThrow(
        'API Error: 404 - {"error":"Session not found"}'
      );
    });

    it("should handle empty session ID", async () => {
      await expect(getChatSession("", mockToken)).rejects.toThrow();
    });

    it("should handle session without messages", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "Empty Session",
        messages: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await getChatSession(mockSessionId, mockToken);
      expect(result.messages).toEqual([]);
    });
  });

  // ==================== CREATE CHAT SESSION TESTS ====================

  describe("createChatSession", () => {
    it("should create chat session successfully with organization context", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "New Chat Session",
        created_by: "user-id",
        org_id: mockOrgId,
        project_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        context_type: "user",
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(
        mockToken,
        mockOrgId,
        "New Chat Session"
      );

      expect(result.id).toBe(mockSessionId);
      expect(result.title).toBe("New Chat Session");
      expect(result.org_id).toBe(mockOrgId);
      expect(result.project_id).toBeNull();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/sessions"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Chat Session",
            org_id: mockOrgId,
          }),
        }
      );
    });

    it("should create chat session with project context", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "Project Chat Session",
        org_id: mockOrgId,
        project_id: mockProjectId,
        context_type: "project",
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(
        mockToken,
        mockOrgId,
        "Project Chat Session",
        mockProjectId
      );

      expect(result.project_id).toBe(mockProjectId);
    });

    it("should create chat session with knowledge base", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "KB Chat Session",
        org_id: mockOrgId,
        knowledge_base_id: mockKbId,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(
        mockToken,
        mockOrgId,
        "KB Chat Session",
        undefined,
        mockKbId
      );

      expect(result.knowledge_base_id).toBe(mockKbId);
    });

    it("should create chat session with default title when not provided", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "New Chat Session",
        org_id: mockOrgId,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(mockToken, mockOrgId);

      expect(result.title).toBe("New Chat Session");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            org_id: mockOrgId,
          }),
        })
      );
    });

    it("should handle 400 missing organization_id", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "organization_id is required" },
          { ok: false, status: 400 }
        )
      );

      await expect(createChatSession(mockToken, "")).rejects.toThrow(
        'API Error: 400 - {"error":"organization_id is required"}'
      );
    });

    it("should handle 403 not organization member", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            error: "Access denied: not a member of this organization",
          },
          { ok: false, status: 403 }
        )
      );

      await expect(
        createChatSession(mockToken, mockOrgId, "New Session")
      ).rejects.toThrow(
        'API Error: 403 - {"error":"Access denied: not a member of this organization"}'
      );
    });

    it("should handle Unicode session titles", async () => {
      const unicodeTitle = "政策文件 📋 Policy Document";
      const mockResponse = {
        id: mockSessionId,
        title: unicodeTitle,
        org_id: mockOrgId,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(
        mockToken,
        mockOrgId,
        unicodeTitle
      );

      expect(result.title).toBe(unicodeTitle);
    });

    it("should handle long session titles", async () => {
      const longTitle = "A".repeat(200);
      const mockResponse = {
        id: mockSessionId,
        title: longTitle,
        org_id: mockOrgId,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createChatSession(mockToken, mockOrgId, longTitle);

      expect(result.title).toBe(longTitle);
    });
  });

  // ==================== UPDATE CHAT SESSION TESTS ====================

  describe("updateChatSession", () => {
    it("should update chat session successfully", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "Updated Session Title",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateChatSession(
        mockSessionId,
        "Updated Session Title",
        mockToken
      );

      expect(result.id).toBe(mockSessionId);
      expect(result.title).toBe("Updated Session Title");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/chat/sessions/${mockSessionId}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Updated Session Title",
          }),
        }
      );
    });

    it("should handle 404 session not found", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Session not found" },
          { ok: false, status: 404 }
        )
      );

      await expect(
        updateChatSession(mockSessionId, "Updated Title", mockToken)
      ).rejects.toThrow('API Error: 404 - {"error":"Session not found"}');
    });

    it("should handle 400 missing title", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Title is required" },
          { ok: false, status: 400 }
        )
      );

      await expect(
        updateChatSession(mockSessionId, "", mockToken)
      ).rejects.toThrow('API Error: 400 - {"error":"Title is required"}');
    });

    it("should handle empty session ID", async () => {
      await expect(
        updateChatSession("", "New Title", mockToken)
      ).rejects.toThrow();
    });

    it("should handle Unicode title updates", async () => {
      const unicodeTitle = "更新された タイトル 🚀";
      const mockResponse = {
        id: mockSessionId,
        title: unicodeTitle,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateChatSession(
        mockSessionId,
        unicodeTitle,
        mockToken
      );

      expect(result.title).toBe(unicodeTitle);
    });

    it("should handle special characters in title", async () => {
      const specialTitle = 'Title with "quotes" & <brackets> and symbols: @#$%';
      const mockResponse = {
        id: mockSessionId,
        title: specialTitle,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateChatSession(
        mockSessionId,
        specialTitle,
        mockToken
      );

      expect(result.title).toBe(specialTitle);
    });
  });

  // ==================== DELETE CHAT SESSION TESTS ====================

  describe("deleteChatSession", () => {
    it("should delete chat session successfully", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse("", { status: 204 }));

      await deleteChatSession(mockSessionId, mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/chat/sessions/${mockSessionId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should handle 404 session not found", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Session not found" },
          { ok: false, status: 404 }
        )
      );

      await expect(deleteChatSession(mockSessionId, mockToken)).rejects.toThrow(
        'API Error: 404 - {"error":"Session not found"}'
      );
    });

    it("should handle empty session ID", async () => {
      await expect(deleteChatSession("", mockToken)).rejects.toThrow();
    });

    it("should handle 403 permission denied", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Permission denied" },
          { ok: false, status: 403 }
        )
      );

      await expect(deleteChatSession(mockSessionId, mockToken)).rejects.toThrow(
        'API Error: 403 - {"error":"Permission denied"}'
      );
    });

    it("should handle 500 server error during deletion", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Failed to delete chat session" },
          { ok: false, status: 500 }
        )
      );

      await expect(deleteChatSession(mockSessionId, mockToken)).rejects.toThrow(
        'API Error: 500 - {"error":"Failed to delete chat session"}'
      );
    });
  });

  // ==================== KNOWLEDGE BASE TESTS ====================

  describe("listKnowledgeBases", () => {
    it("should list knowledge bases successfully", async () => {
      const mockResponse = {
        knowledge_bases: [
          {
            id: mockKbId,
            name: "Test Knowledge Base",
            description: "Test description",
            scope: "organization",
            org_id: mockOrgId,
            project_id: null,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await listKnowledgeBases(mockToken);

      expect(result.knowledge_bases).toHaveLength(1);
      expect(result.knowledge_bases[0].name).toBe("Test Knowledge Base");
      expect(result.knowledge_bases[0].scope).toBe("organization");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/knowledge-bases"),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });

    it("should handle empty knowledge bases list", async () => {
      const mockResponse = {
        knowledge_bases: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await listKnowledgeBases(mockToken);
      expect(result.knowledge_bases).toEqual([]);
    });
  });

  describe("createKnowledgeBase", () => {
    it("should create knowledge base successfully", async () => {
      const mockResponse = {
        id: mockKbId,
        name: "New Knowledge Base",
        description: "Test KB",
        scope: "organization",
        org_id: mockOrgId,
        project_id: null,
        owner_id: "user-id",
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createKnowledgeBase(
        "New Knowledge Base",
        mockOrgId,
        mockToken,
        "Test KB",
        "organization"
      );

      expect(result.id).toBe(mockKbId);
      expect(result.name).toBe("New Knowledge Base");
      expect(result.scope).toBe("organization");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/knowledge-bases"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "New Knowledge Base",
            description: "Test KB",
            scope: "organization",
            org_id: mockOrgId,
          }),
        }
      );
    });

    it("should create project-scoped knowledge base", async () => {
      const mockResponse = {
        id: mockKbId,
        name: "Project KB",
        scope: "project",
        org_id: mockOrgId,
        project_id: mockProjectId,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse, { status: 201 })
      );

      const result = await createKnowledgeBase(
        "Project KB",
        mockOrgId,
        mockToken,
        undefined,
        "project",
        mockProjectId
      );

      expect(result.project_id).toBe(mockProjectId);
    });

    it("should handle 400 missing name", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Name is required" },
          { ok: false, status: 400 }
        )
      );

      await expect(
        createKnowledgeBase("", mockOrgId, mockToken)
      ).rejects.toThrow('API Error: 400 - {"error":"Name is required"}');
    });

    it("should handle 400 project scope without project_id", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            error: "project_id is required for project scope",
          },
          { ok: false, status: 400 }
        )
      );

      await expect(
        createKnowledgeBase(
          "Project KB",
          mockOrgId,
          mockToken,
          undefined,
          "project"
        )
      ).rejects.toThrow(
        'API Error: 400 - {"error":"project_id is required for project scope"}'
      );
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe("Error Handling", () => {
    it("should handle network connection errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        "Failed to fetch"
      );
    });

    it("should handle timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

      await expect(getChatSession(mockToken, mockSessionId)).rejects.toThrow(
        "Request timeout"
      );
    });

    it("should handle invalid JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: jest.fn().mockResolvedValue("invalid json"),
        json: async () => {
          throw new Error("Unexpected token in JSON");
        },
      } as unknown as Response);

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        "Failed to parse API response: invalid json"
      );
    });

    it("should handle 429 rate limiting", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Too Many Requests" },
          { ok: false, status: 429 }
        )
      );

      await expect(createChatSession(mockToken, mockOrgId)).rejects.toThrow(
        'API Error: 429 - {"error":"Too Many Requests"}'
      );
    });

    it("should handle 503 service unavailable", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: "Service Temporarily Unavailable" },
          { ok: false, status: 503 }
        )
      );

      await expect(listChatSessions(mockToken)).rejects.toThrow(
        'API Error: 503 - {"error":"Service Temporarily Unavailable"}'
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe("Edge Cases", () => {
    it("should handle concurrent API calls", async () => {
      const mockResponse1 = {
        sessions: [],
        total: 0,
        limit: 20,
        offset: 0,
        filters: {},
      };
      const mockResponse2 = {
        sessions: [],
        total: 0,
        limit: 20,
        offset: 0,
        filters: {},
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockResponse1))
        .mockResolvedValueOnce(createMockResponse(mockResponse2));

      const [result1, result2] = await Promise.all([
        listChatSessions(mockToken, { org_id: mockOrgId }),
        listChatSessions(mockToken, { org_id: "other-org-id" }),
      ]);

      expect(result1.sessions).toEqual([]);
      expect(result2.sessions).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle very long API responses", async () => {
      const longSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        title: `Session ${i}`,
        org_id: mockOrgId,
      }));

      const mockResponse = {
        sessions: longSessions,
        total: 100,
        limit: 100,
        offset: 0,
        filters: {},
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await listChatSessions(mockToken, { limit: 100 });
      expect(result.sessions).toHaveLength(100);
    });

    it("should handle empty strings in session data", async () => {
      const mockResponse = {
        id: mockSessionId,
        title: "",
        org_id: mockOrgId,
        project_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await getChatSession(mockSessionId, mockToken);
      expect(result.title).toBe("");
      expect(result.org_id).toBe(mockOrgId);
    });
  });
});
