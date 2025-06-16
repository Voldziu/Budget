-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with proper relationships

-- Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint to prevent duplicate categories for a user
  UNIQUE(name, user_id)
);

-- Budgets Table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint to prevent duplicate budgets for a month/year per user
  UNIQUE(month, year, user_id)
);

-- Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_income BOOLEAN NOT NULL DEFAULT FALSE,
  category UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  frequency TEXT, -- 'daily', 'weekly', 'monthly', 'custom'
  custom_frequency JSONB, -- { times: number, period: 'day'|'week'|'month' }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance

-- Index on user_id for all tables
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Index on transaction date for date range queries
CREATE INDEX idx_transactions_date ON transactions(date);

-- Index on category for transaction filtering
CREATE INDEX idx_transactions_category ON transactions(category);

-- Index on month and year for budget lookups
CREATE INDEX idx_budgets_month_year ON budgets(month, year);

-- Row Level Security (RLS) Policies
-- Users can only access their own data

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

  -- Tabela grup budżetowych
CREATE TABLE budget_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela członków grup
CREATE TABLE budget_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES budget_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member', 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Modyfikacja istniejącej tabeli budgets
ALTER TABLE budgets ADD COLUMN group_id UUID REFERENCES budget_groups(id);
ALTER TABLE budgets ADD COLUMN is_group_budget BOOLEAN DEFAULT false;

-- Modyfikacja tabeli transactions
ALTER TABLE transactions ADD COLUMN group_id UUID REFERENCES budget_groups(id);

-- Tylko dodaj tabelę zaproszeń (reszta już istnieje)
CREATE TABLE group_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES budget_groups(id),
  invited_by UUID REFERENCES auth.users(id),
  invited_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);