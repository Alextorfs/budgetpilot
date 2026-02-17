-- Script SQL à exécuter dans Supabase pour créer les tables

-- Table des profils utilisateurs
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  existing_savings DECIMAL(10,2) DEFAULT 0,
  has_shared_account BOOLEAN DEFAULT FALSE,
  shared_monthly_transfer DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des plans budgétaires
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  monthly_salary_net DECIMAL(10,2) NOT NULL,
  fun_savings_monthly_target DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des items (dépenses/revenus)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'biannual', 'oneoff')),
  amount DECIMAL(10,2) NOT NULL,
  payment_month INTEGER CHECK (payment_month >= 1 AND payment_month <= 12),
  allocation_mode TEXT CHECK (allocation_mode IN ('prorata', 'spread')),
  sharing_type TEXT DEFAULT 'individual' CHECK (sharing_type IN ('individual', 'common')),
  my_share_percent DECIMAL(5,2) DEFAULT 100,
  is_included_in_shared_transfer BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des paiements
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  plan_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  item_id UUID NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  uncovered_amount DECIMAL(10,2) DEFAULT 0,
  payment_source TEXT CHECK (payment_source IN ('freeMoney', 'funSavings', 'existingSavings')),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des check-ins mensuels
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  plan_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  did_respect_plan BOOLEAN NOT NULL,
  actual_fun_savings DECIMAL(10,2),
  actual_provision_savings DECIMAL(10,2),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour améliorer les performances
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_plans_profile_id ON plans(profile_id);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_items_plan_id ON items(plan_id);
CREATE INDEX idx_items_is_active ON items(is_active);
CREATE INDEX idx_payment_records_plan_id ON payment_records(plan_id);
CREATE INDEX idx_check_ins_plan_id ON check_ins(plan_id);

-- Row Level Security (RLS) - Chaque utilisateur ne voit que ses données

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour plans
CREATE POLICY "Users can view their own plans"
  ON plans FOR SELECT
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own plans"
  ON plans FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own plans"
  ON plans FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Policies pour items
CREATE POLICY "Users can view their own items"
  ON items FOR SELECT
  USING (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  WITH CHECK (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  USING (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

-- Policies pour payment_records
CREATE POLICY "Users can view their own payments"
  ON payment_records FOR SELECT
  USING (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own payments"
  ON payment_records FOR INSERT
  WITH CHECK (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

-- Policies pour check_ins
CREATE POLICY "Users can view their own check-ins"
  ON check_ins FOR SELECT
  USING (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (plan_id IN (
    SELECT p.id FROM plans p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
