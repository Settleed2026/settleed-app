-- Migration 020: In-app messaging system
-- conversations: one per (property, landlord, tenant) trio
-- messages: individual chat messages within a conversation

CREATE TABLE IF NOT EXISTS public.conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  landlord_unread integer NOT NULL DEFAULT 0,
  tenant_unread   integer NOT NULL DEFAULT 0,
  UNIQUE (property_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  flagged         boolean NOT NULL DEFAULT false,
  flag_reason     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_landlord  ON public.conversations(landlord_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant    ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_property  ON public.conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation   ON public.messages(conversation_id, created_at);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: landlord or tenant can see their own
DROP POLICY IF EXISTS "Parties view own conversations" ON public.conversations;
CREATE POLICY "Parties view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Tenant starts conversation" ON public.conversations;
CREATE POLICY "Tenant starts conversation" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Parties update own conversation" ON public.conversations;
CREATE POLICY "Parties update own conversation" ON public.conversations
  FOR UPDATE USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

-- Messages: parties in the conversation can read/write
DROP POLICY IF EXISTS "Parties read messages" ON public.messages;
CREATE POLICY "Parties read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Parties send messages" ON public.messages;
CREATE POLICY "Parties send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
