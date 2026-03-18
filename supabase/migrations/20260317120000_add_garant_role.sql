-- Add 'garant' to user_role and team_member_role enums
-- Garant (guarantor) is a first-class contact type, like proprietaire — no app login, but stored natively

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'garant';
ALTER TYPE team_member_role ADD VALUE IF NOT EXISTS 'garant';
