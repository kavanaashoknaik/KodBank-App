
-- Create KodUser table (custom auth, not linked to Supabase auth)
CREATE TABLE public.kod_user (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 100000,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Constraint: only 'Customer' role allowed
ALTER TABLE public.kod_user ADD CONSTRAINT role_must_be_customer CHECK (role = 'Customer');

-- Create UserToken table
CREATE TABLE public.user_token (
  tid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  uid UUID NOT NULL REFERENCES public.kod_user(uid) ON DELETE CASCADE,
  expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kod_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_token ENABLE ROW LEVEL SECURITY;

-- These tables are managed entirely by edge functions using service_role key
-- Public access is blocked; edge functions use service_role to bypass RLS
CREATE POLICY "No direct public access to kod_user" ON public.kod_user FOR ALL USING (false);
CREATE POLICY "No direct public access to user_token" ON public.user_token FOR ALL USING (false);
