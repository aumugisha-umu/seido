-- Fix foreign key references in notifications table
-- Replace auth.users references with public.users references

-- Drop existing foreign key constraints
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  DROP CONSTRAINT IF EXISTS notifications_created_by_fkey;

-- Re-add foreign key constraints pointing to public.users
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT notifications_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
