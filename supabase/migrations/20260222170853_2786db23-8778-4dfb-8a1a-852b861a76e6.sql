
-- Create transactions table for deposits and transfers
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_username TEXT,
  to_username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'transfer')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Block all direct public access (accessed via service_role in edge functions)
CREATE POLICY "No direct public access to transactions"
ON public.transactions
AS RESTRICTIVE
FOR ALL
USING (false);
