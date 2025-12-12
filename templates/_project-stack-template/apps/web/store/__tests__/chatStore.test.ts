import { useChatStore } from "../chatStore";
import { act, renderHook } from "@testing-library/react";

// Mock the API functions
jest.mock("../../lib/api", () => ({
  sendChatMessageStream: jest.fn(),
  createChatSession: jest.fn(),
  listChatSessions: jest.fn(),
  getChatSession: jest.fn(),
  updateChatSession: jest.fn(),
  deleteChatSession: jest.fn(),
  listKnowledgeBases: jest.fn(),
  createKnowledgeBase: jest.fn(),
}));

import {
  sendChatMessageStream,
  createChatSession,
  listChatSessions,
  getChatSession,
} from "../../lib/api";

const mockSendChatMessageStream = sendChatMessageStream as jest.Mock;
const mockCreateChatSession = createChatSession as jest.Mock;
const mockListChatSessions = listChatSessions as jest.Mock;
const mockGetChatSession = getChatSession as jest.Mock;

describe("ChatStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    const { result } = renderHook(() => useChatStore());
    act(() => {
      result.current.clearMessages();
      result.current.clearCurrentSession();
      // Also clear sessions array and errors
      (result.current as any).sessions = [];
      (result.current as any).sessionsError = null;
      (result.current as any).error = null;
    });
  });

  describe("Message Management", () => {
    test("should initialize with empty state", () => {
      const { result } = renderHook(() => useChatStore());

      expect(result.current.messages).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.streaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentSessionId).toBeNull();
    });

    test("should add messages correctly", () => {
      const { result } = renderHook(() => useChatStore());

      const testMessage = {
        id: "test-1",
        message: "Test message",
        isUser: true,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        result.current.addMessage(testMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(testMessage);
    });

    test("should clear messages correctly", () => {
      const { result } = renderHook(() => useChatStore());

      // Add a message first
      act(() => {
        result.current.addMessage({
          id: "test-1",
          message: "Test message",
          isUser: true,
        });
      });

      expect(result.current.messages).toHaveLength(1);

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
    });

    test("should set error correctly", () => {
      const { result } = renderHook(() => useChatStore());

      const errorMessage = "Test error";

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("Session Management", () => {
    test("should create session correctly", async () => {
      const mockSession = {
        id: "session-1",
        title: "Test Session",
        knowledge_base_id: "kb-1",
        org_id: "org-1",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockCreateChatSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        const session = await result.current.createSession(
          "mock-token",
          "org-1",
          "Test Session"
        );
        expect(session).toEqual(mockSession);
      });

      expect(result.current.currentSessionId).toBe("session-1");
      expect(result.current.sessions).toContain(mockSession);
    });

    test("should handle session creation error", async () => {
      const error = new Error("Failed to create session");
      mockCreateChatSession.mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useChatStore());

      // Verify the error is thrown when session creation fails
      await expect(
        act(async () => {
          await result.current.createSession(
            "mock-token",
            "org-1",
            "Test Session"
          );
        })
      ).rejects.toThrow("Failed to create session");

      consoleErrorSpy.mockRestore();
    });

    test("should load sessions correctly", async () => {
      const mockSessions = [
        {
          id: "session-1",
          title: "Session 1",
          knowledge_base_id: "kb-1",
          org_id: "org-1",
          created_by: "user-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "session-2",
          title: "Session 2",
          knowledge_base_id: "kb-1",
          org_id: "org-1",
          created_by: "user-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockListChatSessions.mockResolvedValue({ sessions: mockSessions });

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.loadSessions("mock-token", "org-1");
      });

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.sessionsLoading).toBe(false);
      expect(result.current.sessionsError).toBeNull();
    });

    test("should switch sessions correctly", async () => {
      const mockSession = {
        id: "session-1",
        title: "Test Session",
        knowledge_base_id: "kb-1",
        org_id: "org-1",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [
          {
            id: "msg-1",
            role: "user" as const,
            content: "Hello",
            created_at: new Date().toISOString(),
          },
          {
            id: "msg-2",
            role: "assistant" as const,
            content: "Hi there!",
            created_at: new Date().toISOString(),
          },
        ],
      };

      mockGetChatSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.switchSession("mock-token", "session-1");
      });

      expect(result.current.currentSessionId).toBe("session-1");
      expect(result.current.currentKnowledgeBaseId).toBe("kb-1");
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].message).toBe("Hello");
      expect(result.current.messages[0].isUser).toBe(true);
      expect(result.current.messages[1].message).toBe("Hi there!");
      expect(result.current.messages[1].isUser).toBe(false);
    });
  });

  describe("Streaming Messages", () => {
    test("should handle streaming message setup correctly", async () => {
      // Mock the streaming function to simulate successful setup
      const mockCancelFunction = jest.fn();
      mockSendChatMessageStream.mockReturnValue(mockCancelFunction);

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "mock-token");
      });

      // Check that streaming state was set
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].message).toBe("Hello");
      expect(result.current.messages[0].isUser).toBe(true);
      expect(result.current.loading).toBe(true);
      expect(result.current.streaming).toBe(true);
      expect(result.current.cancelStream).toBe(mockCancelFunction);
    });

    test("should handle streaming message completion", async () => {
      let onComplete: ((finalMessage: any) => void) | null = null;

      // Mock getChatSession for the new session fetch
      const mockNewSession = {
        id: "session-1",
        title: "New Chat",
        knowledge_base_id: "kb-1",
        org_id: "org-1",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockGetChatSession.mockResolvedValue(mockNewSession);

      // Mock the streaming function to capture callbacks
      mockSendChatMessageStream.mockImplementation(
        (
          message: string,
          token: string,
          sessionId: string | undefined,
          context: any,
          onChunk: (chunk: string) => void,
          onCompleteCallback: (finalMessage: any) => void,
          onError: (error: Error) => void
        ) => {
          onComplete = onCompleteCallback;
          return jest.fn();
        }
      );

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "mock-token");
      });

      // Simulate completion with a new session
      const finalMessage = {
        id: "ai-msg-1",
        message: "Hello! How can I help you?",
        session_id: "session-1",
        timestamp: new Date().toISOString(),
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      await act(async () => {
        if (onComplete) {
          await onComplete(finalMessage);
        }
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].message).toBe(
        "Hello! How can I help you?"
      );
      expect(result.current.messages[1].isUser).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
      expect(result.current.currentSessionId).toBe("session-1");
    });

    test("should handle streaming chunks correctly", async () => {
      let onChunk: ((chunk: string) => void) | null = null;

      mockSendChatMessageStream.mockImplementation(
        (
          message: string,
          token: string,
          sessionId: string | undefined,
          context: any,
          onChunkCallback: (chunk: string) => void,
          onComplete: (finalMessage: any) => void,
          onError: (error: Error) => void
        ) => {
          onChunk = onChunkCallback;
          return jest.fn();
        }
      );

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "mock-token");
      });

      // Simulate streaming chunks
      act(() => {
        if (onChunk) {
          onChunk("Hello");
        }
      });

      expect(result.current.streamingContent).toBe("Hello");

      act(() => {
        if (onChunk) {
          onChunk(" there");
        }
      });

      expect(result.current.streamingContent).toBe("Hello there");
    });

    test("should handle streaming errors correctly", async () => {
      let onError: ((error: Error) => void) | null = null;
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockSendChatMessageStream.mockImplementation(
        (
          message: string,
          token: string,
          sessionId: string | undefined,
          context: any,
          onChunk: (chunk: string) => void,
          onComplete: (finalMessage: any) => void,
          onErrorCallback: (error: Error) => void
        ) => {
          onError = onErrorCallback;
          return jest.fn();
        }
      );

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "mock-token");
      });

      // Simulate streaming error
      const error = new Error("Streaming failed");

      act(() => {
        if (onError) {
          onError(error);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
      expect(result.current.error).toBe("Streaming failed");
      consoleErrorSpy.mockRestore();
    });

    test("should cancel streaming correctly", async () => {
      const mockCancelFunction = jest.fn();
      mockSendChatMessageStream.mockReturnValue(mockCancelFunction);

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "mock-token");
      });

      // Cancel the stream
      act(() => {
        result.current.cancelCurrentStream();
      });

      expect(mockCancelFunction).toHaveBeenCalled();
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
      expect(result.current.cancelStream).toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid token in sendMessageStream", async () => {
      // Mock sendChatMessageStream to call onError immediately for invalid token
      mockSendChatMessageStream.mockImplementation(
        (
          message: string,
          token: string,
          sessionId: string | undefined,
          context: any,
          onChunk: (chunk: string) => void,
          onComplete: (finalMessage: any) => void,
          onError: (error: Error) => void
        ) => {
          // Simulate immediate error for invalid token
          onError(new Error("Authentication token is required"));
          return jest.fn();
        }
      );

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("Hello", "");
      });

      // The API validates and calls onError, which sets error and clears streaming/loading
      expect(result.current.error).toBe("Authentication token is required");
      // Streaming starts initially but is cleared by the error callback
      expect(result.current.streaming).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    test("should handle empty message in sendMessageStream", async () => {
      // Mock sendChatMessageStream to call onError immediately for empty message
      mockSendChatMessageStream.mockImplementation(
        (
          message: string,
          token: string,
          sessionId: string | undefined,
          context: any,
          onChunk: (chunk: string) => void,
          onComplete: (finalMessage: any) => void,
          onError: (error: Error) => void
        ) => {
          // Simulate immediate error for empty message
          onError(new Error("Message is required"));
          return jest.fn();
        }
      );

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessageStream("", "valid-token");
      });

      // The API validates and calls onError, which sets error and clears streaming/loading
      expect(result.current.error).toBe("Message is required");
      // Streaming starts initially but is cleared by the error callback
      expect(result.current.streaming).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    test("should handle API failures in session operations", async () => {
      const error = new Error("API Error");
      mockListChatSessions.mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.loadSessions("mock-token", "org-1", true);
      });

      expect(result.current.sessionsLoading).toBe(false);
      expect(result.current.sessionsError).toBe("API Error");
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Utility Functions", () => {
    test("getCurrentSession should return current session", () => {
      const mockSession = {
        id: "session-1",
        title: "Test Session",
        knowledge_base_id: "kb-1",
        org_id: "org-1",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { result } = renderHook(() => useChatStore());

      act(() => {
        // Clear any existing sessions first
        (result.current as any).sessions = [];
        // Manually set session state
        (result.current as any).sessions = [mockSession];
        (result.current as any).currentSessionId = "session-1";
      });

      const currentSession = result.current.getCurrentSession();
      expect(currentSession).toEqual(
        expect.objectContaining({
          id: "session-1",
          title: "Test Session",
        })
      );
    });

    test("getCurrentSession should return null when no current session", () => {
      const { result } = renderHook(() => useChatStore());

      const currentSession = result.current.getCurrentSession();
      expect(currentSession).toBeNull();
    });

    test("clearCurrentSession should reset session state", () => {
      const { result } = renderHook(() => useChatStore());

      // Set up some session state
      act(() => {
        result.current.addMessage({
          id: "msg-1",
          message: "Hello",
          isUser: true,
        });
        (result.current as any).currentSessionId = "session-1";
        (result.current as any).conversationId = "conv-1";
      });

      // Clear session
      act(() => {
        result.current.clearCurrentSession();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.conversationId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
    });
  });
});
