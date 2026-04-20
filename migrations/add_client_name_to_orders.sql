-- Add client_name column to orders table (stores the customer's name from the form)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
