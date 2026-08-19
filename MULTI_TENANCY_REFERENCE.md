# Multi-Tenancy Migration Reference

## 1. EXISTING TABLES FOUND

```
1. profiles (User table)
   - Columns: id (UUID, pk), role (enum: admin/user/visitatore), created_at, updated_at
   - Source: Supabase Auth + manual profile record
   - Data: ~few users
   - Tenant Identifier: None (will add company_id)

2. contracts (Business data)
   - Columns: id, code, client_name, site_name, address, status, monthly_revenue, service_requirements (JSON array), created_at
   - Source: Manual entry via ContractForm
   - Data: Multiple contracts
   - Tenant Identifier: None (will add company_id)
   - Relationships: Referenced by employees.contract_ids, shifts.contract_id

3. employees (Business data)
   - Columns: id, code, first_name, last_name, phone, status, contract_ids (array), hourly_cost, created_at
   - Source: Manual entry via EmployeeForm
   - Data: Multiple employees
   - Tenant Identifier: None (will add company_id)
   - Relationships: Referenced by shifts.employee_id

4. shifts (Business data)
   - Columns: id, employee_id (FK), contract_id (FK), date, start_time, end_time, created_at
   - Source: Manual entry via ShiftForm or bulk operations
   - Data: Many shifts
   - Tenant Identifier: None (will add company_id)
   - Relationships: Links employees + contracts

5. audit_logs (Audit trail)
   - Columns: id, user_id, user_name, action, details, week_start, week_end, created_at
   - Source: Created by Turni.jsx operations
   - Data: Moderate volume
   - Tenant Identifier: None (will add company_id)
   - Purpose: Track shifts deletion and other admin actions

6. whatsapp_audits (Integration audit)
   - Columns: id, action, content, delivery_status, user_id, user_name, created_at
   - Source: Created by WhatsAppProgramModal.jsx
   - Data: Low volume
   - Tenant Identifier: None (will add company_id)
   - Purpose: Track WhatsApp program sends
```

---

## 2. EXACT FILES REQUIRING MODIFICATION

### Core Authentication & Initialization (3 files)
```
d:\vscode\PuliGo\AuthContext.jsx
  - Add company context provider
  - Fetch company_users on auth state change
  - Add selectCompany() method
  - Add activationRequired check

d:\vscode\PuliGo\Login.jsx
  - Check if user has assigned company
  - Redirect to /activate if no company

d:\vscode\PuliGo\Register.jsx
  - Optional: Create first company on signup
  - Or redirect to /activate for license entry
```

### New Pages (2 files - CREATE NEW)
```
d:\vscode\PuliGo\Activate.jsx (NEW FILE)
  - License code form
  - Validate license in licenses table
  - Create company record
  - Create company_users entry
  - Redirect to /onboarding

d:\vscode\PuliGo\Onboarding.jsx (NEW FILE)
  - Company setup wizard
  - Import data options
  - Invite team members
  - Redirect to dashboard
```

### Critical Data Access (1 file - MAJOR CHANGES)
```
d:\vscode\PuliGo\useOperationsData.js
  - Add company_id filter to contracts query
  - Add company_id filter to employees query
  - Add company_id filter to shifts queries (3 places: initial load, insert, update, delete)
  - Add company context from useAuth()
  - Handle missing company context gracefully
```

### Data Entry Forms (3 files - MINIMAL CHANGES)
```
d:\vscode\PuliGo\ContractForm.jsx
  - Auto-inject company_id to created records

d:\vscode\PuliGo\EmployeeForm.jsx
  - Auto-inject company_id to created records

d:\vscode\PuliGo\ShiftForm.jsx
  - Auto-inject company_id to created records
```

### Pages Using useOperationsData (9 files - NO CHANGES NEEDED IF useOperationsData works)
```
d:\vscode\PuliGo\Dashboard.jsx (READ ONLY)
d:\vscode\PuliGo\Appalti.jsx (READ ONLY)
d:\vscode\PuliGo\Dipendenti.jsx (READ ONLY)
d:\vscode\PuliGo\Turni.jsx (MINOR: ensure company_id in audit logs)
d:\vscode\PuliGo\Buchi.jsx (READ ONLY)
d:\vscode\PuliGo\ResocontoMensile.jsx (READ ONLY)
d:\vscode\PuliGo\MarginiAppalti.jsx (READ ONLY)
d:\vscode\PuliGo\Statistiche.jsx (READ ONLY)
d:\vscode\PuliGo\Admin.jsx (UPDATE: company user management)
```

### Database Abstraction (1 file - OPTIONAL)
```
d:\vscode\PuliGo\db.js
  - Optional: Add company context awareness
  - Auto-inject company_id in entity operations
  - Currently: Manual injection in forms is acceptable
```

### Audit & Integration (2 files - AUDIT LOG ENHANCEMENT)
```
d:\vscode\PuliGo\Turni.jsx
  - Ensure audit_logs include company_id

d:\vscode\PuliGo\WhatsAppProgramModal.jsx
  - Ensure whatsapp_audits include company_id
```

### Admin & Settings (1 file - FUTURE EXPANSION)
```
d:\vscode\PuliGo\Admin.jsx
  - New section for company settings management
  - Company name, plan, license display
  - User role management (per company)
  - Invite users to company
  - Future: suspension/billing management
```

### Optional Components (1 file - IF multi-company support)
```
d:\vscode\PuliGo\CompanySelector.jsx (NEW - OPTIONAL)
  - Dropdown to switch between companies user has access to
  - Call useAuth().selectCompany(id)
  - Update company context
  - Reload all data
```

---

## 3. PROPOSED NEW DATABASE STRUCTURE

### Table: companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended', 'trial', 'inactive')) DEFAULT 'active',
  plan TEXT CHECK (plan IN ('starter', 'pro', 'enterprise')) DEFAULT 'starter',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'expired', 'payment_failed', 'none')) DEFAULT 'none',
  license_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_plan CHECK (plan IS NOT NULL)
);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_slug ON companies(slug);
```

### Table: licenses
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  seats_included INTEGER DEFAULT 5,
  issued_at TIMESTAMP DEFAULT now(),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'activated', 'expired', 'revoked')) DEFAULT 'pending',
  
  CONSTRAINT valid_activation CHECK (
    CASE 
      WHEN status = 'activated' THEN activated_at IS NOT NULL AND company_id IS NOT NULL
      ELSE TRUE
    END
  )
);

CREATE INDEX idx_licenses_code ON licenses(code);
CREATE INDEX idx_licenses_company ON licenses(company_id);
CREATE INDEX idx_licenses_status ON licenses(status);
```

### Table: company_users (Memberships)
```sql
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) NOT NULL DEFAULT 'member',
  invited_email TEXT,
  joined_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(company_id, user_id),
  CONSTRAINT no_duplicate_email_invitation CHECK (
    CASE
      WHEN invited_email IS NOT NULL THEN user_id IS NULL
      ELSE TRUE
    END
  )
);

CREATE INDEX idx_company_users_company ON company_users(company_id);
CREATE INDEX idx_company_users_user ON company_users(user_id);
CREATE INDEX idx_company_users_email ON company_users(invited_email);
```

### Table: subscriptions (for future billing)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  seats_used INTEGER DEFAULT 0,
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled')) DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  auto_renew BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Altered: profiles (add company_id)
```sql
ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX idx_profiles_company ON profiles(company_id);
```

### Altered: contracts (add company_id)
```sql
ALTER TABLE contracts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_contracts_company ON contracts(company_id);
ALTER TABLE contracts ADD UNIQUE(company_id, code);
```

### Altered: employees (add company_id)
```sql
ALTER TABLE employees ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_employees_company ON employees(company_id);
```

### Altered: shifts (add company_id)
```sql
ALTER TABLE shifts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_shifts_company ON shifts(company_id);
```

### Altered: audit_logs (add company_id)
```sql
ALTER TABLE audit_logs ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
```

### Altered: whatsapp_audits (add company_id)
```sql
ALTER TABLE whatsapp_audits ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_whatsapp_audits_company ON whatsapp_audits(company_id);
```

---

## 4. PROPOSED RLS STRATEGY

### Principle
User can only access data from companies they are members of.

### RLS Policy Template for Business Tables

```sql
-- Enable RLS on table
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- SELECT policy: User sees data only if they're in that company
CREATE POLICY "<table_name>_select_company_data" ON <table_name>
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: User can create data only for their company
CREATE POLICY "<table_name>_insert_company_data" ON <table_name>
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE policy: User can update only their company's data
CREATE POLICY "<table_name>_update_company_data" ON <table_name>
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE policy: User can delete only their company's data
CREATE POLICY "<table_name>_delete_company_data" ON <table_name>
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );
```

### RLS Policies to Create

Apply above template to:
1. contracts
2. employees
3. shifts
4. audit_logs
5. whatsapp_audits

### Special Policies: company_users

```sql
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- User can see other members of their companies
CREATE POLICY "company_users_view_own_company" ON company_users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Only company admins can invite/manage users
CREATE POLICY "company_users_admin_manage" ON company_users
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- Admins can remove members
CREATE POLICY "company_users_admin_delete" ON company_users
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );
```

### Special Policies: companies

```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- User can view companies they're in
CREATE POLICY "companies_view_own" ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Only created_by can update company (or future app admin)
CREATE POLICY "companies_update_owner" ON companies
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

### Special Policies: profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User can see their own profile
CREATE POLICY "profiles_view_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- User can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Company admins can view their team's profiles
CREATE POLICY "profiles_view_company_members" ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM company_users 
      WHERE company_id IN (
        SELECT company_id FROM company_users 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
```

### Helper View (Optional, for clarity)

```sql
CREATE VIEW user_companies AS
SELECT 
  cu.company_id,
  c.name,
  c.slug,
  c.plan,
  c.status,
  cu.role,
  cu.user_id
FROM company_users cu
JOIN companies c ON cu.company_id = c.id;
```

---

## 5. ACTIVATION/LICENSE CODE PROCESS

### License Code Format
- Format: `PG-XXXX-XXXX-XXXX` (4+4+4 = 12 random alphanumeric characters)
- Total display length: 16 chars (with dashes)
- Generation: Crypto random, uppercase letters + numbers

### Flow: New Customer Activation

**Step 1: Customer receives code**
- Generated by app admin or sales system
- Stored in `licenses` table with status='pending'
- Email to customer or display on invoice

**Step 2: Customer visits app**
- Not logged in, or logged in with no company assignment
- Redirected to `/activate`

**Step 3: Enter code on /activate page**
- Form with single text input
- Clear instructions: "Enter the activation code from your license email"
- Submit button "Activate"

**Step 4: Server validates code**
```javascript
// Pseudocode
const license = await supabase
  .from('licenses')
  .select('*')
  .eq('code', enteredCode)
  .eq('status', 'pending')
  .single();

if (!license || license.expires_at < now()) {
  throw new Error('Code invalid or expired');
}
```

**Step 5: Create company**
```javascript
const company = await supabase
  .from('companies')
  .insert({
    name: `${user.email}'s Company`, // Auto-generated, can be changed later
    slug: generateSlug(),
    status: 'active',
    plan: license.plan,
    created_by: user.id
  })
  .select()
  .single();
```

**Step 6: Link license to company**
```javascript
await supabase
  .from('licenses')
  .update({
    company_id: company.id,
    activated_at: now(),
    status: 'activated'
  })
  .eq('id', license.id);
```

**Step 7: Create company_users membership**
```javascript
await supabase
  .from('company_users')
  .insert({
    company_id: company.id,
    user_id: user.id,
    role: 'admin'
  });
```

**Step 8: Create audit log**
```javascript
await supabase
  .from('audit_logs')
  .insert({
    company_id: company.id,
    user_id: user.id,
    action: 'Company activated',
    details: `Company activated with license ${license.code}`
  });
```

**Step 9: Redirect to onboarding**
```javascript
window.location.href = '/onboarding';
```

---

## 6. PHASED IMPLEMENTATION SCHEDULE

### Recommended Timeline: 4-5 Weeks

```
Week 1: Database Preparation & Existing Data Migration
├─ Phase 1: Create new tables (companies, licenses, company_users, subscriptions)
├─ Phase 2: Add company_id columns to existing tables
├─ Phase 2: Migrate existing company data
└─ Checkpoint: Database ready, data migrated, all records have company_id

Week 2: Application Context & Data Filtering
├─ Phase 3: Enhance AuthContext with company awareness
├─ Phase 4: Update useOperationsData with company_id filtering
├─ Phase 5: Update forms to auto-inject company_id
└─ Checkpoint: App flows company through all layers, data filtered by company

Week 3: Security & RLS Enforcement
├─ Phase 6: Enable RLS policies on all tables
├─ Phase 6: Test cross-company data isolation
├─ Phase 6: Monitor for RLS blocking legitimate queries
└─ Checkpoint: Database enforces company isolation at RLS level

Week 4: New Features & Admin
├─ Phase 7: Implement license activation (/activate page)
├─ Phase 7: Implement onboarding flow (/onboarding page)
├─ Phase 8: Update Admin panel for company management
└─ Checkpoint: New customer can activate with license code

Week 5: Production Deployment
├─ Phase 9: Documentation and testing
├─ Phase 10: Final QA and staging validation
├─ Phase 10: Production deployment
└─ Checkpoint: Live with multi-tenant system

Buffer: 1 week for unforeseen issues, testing refinements
```

### Phase Dependencies

```
Phase 1 (Database setup)
  ↓
Phase 2 (Data migration)
  ↓ (must complete before proceeding)
  ├─→ Phase 3 (AuthContext) →─┐
  ├─→ Phase 4 (useOperationsData) →─┤
  ├─→ Phase 5 (Forms) ────────→─┤
  │                                ↓
  └──→ Phase 6 (RLS)  ←────────────┘
           ↓
      Phase 7 (Activation)
           ↓
      Phase 8 (Admin UI)
           ↓
      Phase 9-10 (Testing & Deploy)
```

### Rollback Plan by Phase

| Phase | Rollback Method | Difficulty |
|-------|-----------------|----------|
| 1 | Drop new tables, restore backup | Easy |
| 2 | UPDATE ... SET company_id = NULL | Medium |
| 3 | Revert AuthContext, redeploy | Easy |
| 4 | Remove .eq('company_id') filters | Easy |
| 5 | Remove company_id from form submissions | Easy |
| 6 | Disable RLS on all tables | Medium |
| 7 | Remove /activate page, skip flow | Easy |
| 8 | Hide new Admin sections | Easy |

---

**Ready for stakeholder review and approval to proceed.**
