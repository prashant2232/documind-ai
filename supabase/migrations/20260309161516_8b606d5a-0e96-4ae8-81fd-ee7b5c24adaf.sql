
-- Clear existing data (no users yet, so this is safe)
DELETE FROM public.chat_messages;
DELETE FROM public.chat_sessions;

-- Add user_id column
ALTER TABLE public.chat_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow all on chat_messages" ON public.chat_messages;

-- chat_sessions: users can only access their own
CREATE POLICY "Users can select own sessions" ON public.chat_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- chat_messages: users can access messages in their own sessions
CREATE POLICY "Users can select own messages" ON public.chat_messages FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
