
-- Create scans table
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  image_path text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED')),
  vision_result jsonb,
  top_label text,
  top_confidence float,
  category text CHECK (category IN ('FOOD','NON_FOOD','UNCERTAIN')),
  final_food_name text,
  usda_food jsonb,
  nutrition jsonb,
  error_message text
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  metadata jsonb
);

-- Enable RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Scans policies: allow anonymous access via session_id or authenticated via user_id
CREATE POLICY "Users can view own scans" ON public.scans
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert scans" ON public.scans
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can update own scans" ON public.scans
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Chat messages policies
CREATE POLICY "Users can view scan messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scans s WHERE s.id = scan_id
      AND (
        (auth.uid() IS NOT NULL AND s.user_id = auth.uid())
        OR (auth.uid() IS NULL AND s.session_id IS NOT NULL)
      )
    )
  );

CREATE POLICY "Users can insert messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans s WHERE s.id = scan_id
      AND (
        (auth.uid() IS NOT NULL AND s.user_id = auth.uid())
        OR (auth.uid() IS NULL AND s.session_id IS NOT NULL)
      )
    )
  );

-- Service role policies for edge functions
CREATE POLICY "Service role full access scans" ON public.scans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages" ON public.chat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Anyone can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Anyone can view uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');
