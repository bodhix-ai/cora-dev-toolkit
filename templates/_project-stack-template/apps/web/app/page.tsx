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
  CircularProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  Attachment as AttachIcon,
} from "@mui/icons-material";
import ChatContainer from "../components/ChatContainer";
import { useChatStore } from "@/store/chatStore";
import { useTokenManager } from "@/lib/auth-utils";
import { useSidebarStore } from "@/store/sidebarStore";
import { useUser, useOrganizationContext, type Profile } from "@{{PROJECT_NAME}}/module-access";
import GlobalLayoutToggle from "../components/GlobalLayoutToggle";

export default function HomePage() {
  const { profile, isAuthenticated, loading: userLoading } = useUser();

  // Show loading state while auth state is being determined
  if (userLoading) {
    return (
      <Container maxWidth="md" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading your session...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Box sx={{ textAlign: "center", maxWidth: "600px" }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "#D97706",
              fontSize: "2.5rem",
              mx: "auto",
              mb: 3,
            }}
          >
            ✦
          </Avatar>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 500,
              color: "text.primary",
              mb: 2,
              fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
            }}
          >
            Welcome to {{PROJECT_DISPLAY_NAME}}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: "text.secondary",
              mb: 4,
              fontWeight: 400,
              fontSize: "1.25rem",
              fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
            }}
          >
            AI-driven workspace for your organization
          </Typography>
          <Button
            variant="contained"
            size="large"
            href="/api/auth/signin"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Sign In with Okta
          </Button>
        </Box>
      </Container>
    );
  }

  // User is authenticated - render the full page with all hooks
  return <AuthenticatedHomePage profile={profile} />;
}

/**
 * AuthenticatedHomePage - Only rendered when user is authenticated
 * This allows us to safely call useOrganizationContext() which requires OrgProvider
 */
function AuthenticatedHomePage({ profile }: { profile: Profile | null }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const {
    currentSessionId,
    messages,
    sendMessageStream,
    createSession,
    setError,
    streaming,
  } = useChatStore();
  const { currentOrganization, isLoading: orgLoading } = useOrganizationContext();
  const {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    setLeftSidebarCollapsed,
    setRightSidebarCollapsed,
  } = useSidebarStore();
  const tokenManager = useTokenManager();
  const prevStreamingRef = React.useRef(false);

  // Auto-hide sidebars on mobile
  useEffect(() => {
    if (isMobile) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
  }, [isMobile, setLeftSidebarCollapsed, setRightSidebarCollapsed]);

  // Update URL when streaming completes
  useEffect(() => {
    const prevStreaming = prevStreamingRef.current;
    
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
    
    // Update ref after processing
    prevStreamingRef.current = streaming;
  }, [streaming, currentSessionId, messages.length, router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    if (profile?.name) {
      return profile.name.split(" ")[0];
    }
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
        const organizationId = currentOrganization?.orgId;
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
          org_name: currentOrganization?.orgName || "{{PROJECT_DISPLAY_NAME}}",
          role: profile?.globalRole || "member",
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

  // Authenticated home page content
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
          aria-label="Chat input"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="inherit" aria-label="Attach file">
                    <AttachIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    aria-label="Send message"
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
