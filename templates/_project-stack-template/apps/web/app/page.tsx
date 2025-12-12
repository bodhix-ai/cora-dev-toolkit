"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Avatar,
  Stack,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Send as SendIcon,
  Attachment as AttachIcon,
} from "@mui/icons-material";
import { useUserStore } from "@/store/userStore";
import ChatContainer from "../components/ChatContainer";
import { useChatStore } from "@/store/chatStore";
import { useTokenManager } from "@/lib/auth-utils";
import { useOrganizationStore } from "@/store/organizationStore";
import { useSidebarStore } from "@/store/sidebarStore";
import GlobalLayoutToggle from "../components/GlobalLayoutToggle";

export default function HomePage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const { profile } = useUserStore();
  const {
    currentSessionId,
    messages,
    sendMessageStream,
    createSession,
    setError,
    streaming,
  } = useChatStore();
  const { selectedOrganization } = useOrganizationStore();
  const {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    setLeftSidebarCollapsed,
    setRightSidebarCollapsed,
  } = useSidebarStore();
  const tokenManager = useTokenManager();
  const [prevStreaming, setPrevStreaming] = useState(false);

  // Auto-hide sidebars on mobile
  useEffect(() => {
    if (isMobile) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
  }, [isMobile, setLeftSidebarCollapsed, setRightSidebarCollapsed]);

  // Update URL when streaming completes (response just finished)
  // Only navigate if we JUST finished streaming a response, not when loading with old messages
  useEffect(() => {
    // Track streaming state changes
    if (prevStreaming !== streaming) {
      setPrevStreaming(streaming);

      // Only redirect when streaming JUST COMPLETED (was true, now false)
      // This means we just received a response and should navigate to the chat page
      if (
        prevStreaming === true &&
        streaming === false &&
        currentSessionId &&
        messages.length > 0
      ) {
        const currentPath = window.location.pathname;
        const targetPath = `/chat/${currentSessionId}`;

        if (currentPath === "/") {
          console.log(`Streaming completed, navigating to: ${targetPath}`);
          router.push(targetPath as any);
        }
      }
    }
  }, [streaming, prevStreaming, currentSessionId, messages.length, router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    // Prefer full_name over email extraction
    if (profile?.full_name) {
      // Extract first name from full name (e.g., "Naman Kumar" -> "Naman")
      return profile.full_name.split(" ")[0];
    }
    // Fallback to email extraction if full_name not available
    if (profile?.email) {
      return profile.email.split("@")[0];
    }
    return "there";
  };

  const handleSend = async () => {
    if (message.trim() && !sending) {
      setSending(true);
      try {
        // Get valid authentication token
        const token = await tokenManager.getValidToken();
        if (!token) {
          setError(
            "Authentication token expired. Please refresh the page and try again."
          );
          return;
        }

        // Ensure we have organization context
        const organizationId = selectedOrganization?.id;
        if (!organizationId) {
          setError(
            "Organization context required. Please select an organization."
          );
          return;
        }

        // Create a session if we don't have one
        if (!currentSessionId) {
          console.log("Creating new chat session");
          await createSession(token, organizationId, "New Chat");
        }

        // Prepare context
        const context = {
          org_name: selectedOrganization?.name || "{{PROJECT_DISPLAY_NAME}}",
          role: profile?.global_role || "member",
        };

        const messageToSend = message;
        console.log("Sending message:", messageToSend);

        // Clear the input immediately
        setMessage("");

        // Send the message using streaming
        await sendMessageStream(messageToSend, token, context);
      } catch (error) {
        console.error("Failed to send message:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again."
        );
        // Restore message if sending failed
        setMessage(message);
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Home page always shows welcome screen - ChatContainer is only shown on /chat/[id] pages
  // This prevents the issue where clicking "New Chat" would show old chat content
  return (
    <Container
      maxWidth="md"
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        py: 4,
      }}
    >
      {/* Header with greeting */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Box sx={{ mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "#D97706",
              fontSize: "2rem",
              mx: "auto",
              mb: 2,
            }}
          >
            ✦
          </Avatar>
        </Box>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 400,
            color: "text.primary",
            mb: 1,
            fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
          }}
        >
          {getGreeting()}, {getUserName()}
        </Typography>
      </Box>

      {/* Main input area */}
      <Box sx={{ width: "100%", mb: 4 }}>
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={6}
          placeholder="How can I help you today?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="inherit">
                    <AttachIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                  >
                    <SendIcon />
                  </IconButton>
                </Stack>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "24px",
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": {
                borderColor: "primary.main",
              },
              "&.Mui-focused": {
                borderColor: "primary.main",
                boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.1)",
              },
            },
            "& .MuiInputBase-input": {
              px: 3,
              py: 2,
              fontSize: "1rem",
              fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
            },
          }}
        />
      </Box>

      {/* Footer disclaimer */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          mt: 6,
          textAlign: "center",
          fontSize: "0.75rem",
          fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
        }}
      >
        {"{{PROJECT_DISPLAY_NAME}} can make mistakes. Check important info."}
      </Typography>
    </Container>
  );
}
