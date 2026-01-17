-- =============================================
-- MODULE-CHAT: KB Integration RLS Policies
-- =============================================
-- Purpose: Apply RLS policies to chat_session_kb table AFTER module-kb is installed
-- Source: Created for CORA toolkit Jan 2026
--
-- NOTE: This migration MUST run AFTER:
--   1. module-kb is installed (provides kb_bases table)
--   2. 008-chat-session-kb.sql has run (creates chat_session_kb table)
--   3. 006-chat-rpc-functions.sql has run (provides is_chat_owner, can_view_chat)
-- See deployment sequence in docs/plans/plan_module-chat-implementation.md

-- =============================================
-- CHAT_SESSION_KB TABLE RLS (Junction: chat_sessions <-> kb_bases)
-- =============================================

ALTER TABLE public.chat_session_kb ENABLE ROW LEVEL SECURITY;

-- Users can view KB associations for chats they can access
DROP POLICY IF EXISTS "Users can view KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Users can view KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Users can view KB associations" ON public.chat_session_kb;
CREATE POLICY "Users can view KB associations" ON public.chat_session_kb
FOR SELECT
TO authenticated
USING (
    public.can_view_chat(auth.uid(), session_id)
);

-- Only chat owner can add KB associations
DROP POLICY IF EXISTS "Chat owner can add KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can add KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can add KB associations" ON public.chat_session_kb;
CREATE POLICY "Chat owner can add KB associations" ON public.chat_session_kb
FOR INSERT
TO authenticated
WITH CHECK (
    added_by = auth.uid() AND
    public.is_chat_owner(auth.uid(), session_id)
);

-- Only chat owner can update KB associations (enable/disable)
DROP POLICY IF EXISTS "Chat owner can update KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can update KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can update KB associations" ON public.chat_session_kb;
CREATE POLICY "Chat owner can update KB associations" ON public.chat_session_kb
FOR UPDATE
TO authenticated
USING (public.is_chat_owner(auth.uid(), session_id))
WITH CHECK (public.is_chat_owner(auth.uid(), session_id));

-- Only chat owner can remove KB associations
DROP POLICY IF EXISTS "Chat owner can remove KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can remove KB associations" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Chat owner can remove KB associations" ON public.chat_session_kb;
CREATE POLICY "Chat owner can remove KB associations" ON public.chat_session_kb
FOR DELETE
TO authenticated
USING (public.is_chat_owner(auth.uid(), session_id));

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to chat_session_kb" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Service role full access to chat_session_kb" ON public.chat_session_kb;
DROP POLICY IF EXISTS "Service role full access to chat_session_kb" ON public.chat_session_kb;
CREATE POLICY "Service role full access to chat_session_kb" ON public.chat_session_kb
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_session_kb TO authenticated;

COMMENT ON POLICY "Users can view KB associations" ON public.chat_session_kb IS 'Users can view KB associations for chats they can access';
COMMENT ON POLICY "Chat owner can add KB associations" ON public.chat_session_kb IS 'Only chat owner can add KB associations';
COMMENT ON POLICY "Chat owner can update KB associations" ON public.chat_session_kb IS 'Only chat owner can enable/disable KB associations';
COMMENT ON POLICY "Chat owner can remove KB associations" ON public.chat_session_kb IS 'Only chat owner can remove KB associations';
