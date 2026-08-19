# Quick Reference Checklists

## A. EXISTING TABLES SUMMARY

| # | Table | Records | Key Columns | Needs company_id |
|---|-------|---------|------------|-----------------|
| 1 | profiles | Users | id, role | ✅ Yes (nullable) |
| 2 | contracts | Contracts/Appalti | id, code, site_name, client_name, status | ✅ Yes (NOT NULL) |
| 3 | employees | Staff | id, code, first_name, last_name, status | ✅ Yes (NOT NULL) |
| 4 | shifts | Shift assignments | id, employee_id, contract_id, date, time | ✅ Yes (NOT NULL) |
| 5 | audit_logs | Admin audit trail | id, action, user_id, user_name | ✅ Yes (NOT NULL) |
| 6 | whatsapp_audits | WhatsApp log | id, action, delivery_status | ✅ Yes (NOT NULL) |

**Total: 6 existing tables, ALL need company_id**

---

## B. NEW TABLES REQUIRED

| # | Table | Type | Primary Purpose | FK Relationships |
|---|-------|------|-----------------|-----------------|
| 1 | companies | Tenant | Store company/tenant records | ← created_by (profiles) |
| 2 | licenses | Activation | Store license codes for activation | → company_id |
| 3 | company_users | Membership | Link users to companies + roles | company_id, user_id |
| 4 | subscriptions | Billing | (Optional) store billing info | → company_id |

**Total: 4 new tables (1 optional)**

---

## C. CRITICAL FILES TO MODIFY

### Must Modify (Will break without changes)
```
1. d:\vscode\PuliGo\AuthContext.jsx          [5-7 hours] - Add company context
2. d:\vscode\PuliGo\useOperationsData.js     [3-4 hours] - Add company filtering
3. d:\vscode\PuliGo\ContractForm.jsx         [30 min]    - Auto inject company_id
4. d:\vscode\PuliGo\EmployeeForm.jsx         [30 min]    - Auto inject company_id
5. d:\vscode\PuliGo\ShiftForm.jsx            [30 min]    - Auto inject company_id
```

### Should Modify (Better UX)
```
6. d:\vscode\PuliGo\Login.jsx                [1-2 hours] - Check company assignment
7. d:\vscode\PuliGo\Turni.jsx                [30 min]    - Ensure audit logs have company_id
8. d:\vscode\PuliGo\Admin.jsx                [2-3 hours] - Add company management UI
```

### Create New (Essential for activation)
```
9. d:\vscode\PuliGo\Activate.jsx (NEW)       [2-3 hours] - License activation page
10. d:\vscode\PuliGo\Onboarding.jsx (NEW)    [2-3 hours] - Onboarding wizard
```

### Can be Left Alone (Data auto-filters)
```
✅ Dashboard.jsx
✅ Appalti.jsx
✅ Dipendenti.jsx
✅ Buchi.jsx
✅ ResocontoMensile.jsx
✅ MarginiAppalti.jsx
✅ Statistiche.jsx
✅ Forms (ContractForm - if generic company injection works)
```

**Estimated Time: 20-30 developer hours for code changes**

---

## D. DATABASE SCHEMA CHANGES

### New Tables (Copy-Paste Ready)

```sql
-- 1. COMPANIES TABLE
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
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_slug ON companies(slug);

-- 2. LICENSES TABLE
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  seats_included INTEGER DEFAULT 5,
  issued_at TIMESTAMP DEFAULT now(),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'activated', 'expired', 'revoked')) DEFAULT 'pending'
);
CREATE INDEX idx_licenses_code ON licenses(code);
CREATE INDEX idx_licenses_company ON licenses(company_id);

-- 3. COMPANY_USERS TABLE
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) NOT NULL DEFAULT 'member',
  invited_email TEXT,
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(company_id, user_id)
);
CREATE INDEX idx_company_users_company ON company_users(company_id);
CREATE INDEX idx_company_users_user ON company_users(user_id);

-- 4. SUBSCRIPTIONS TABLE (OPTIONAL)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  seats_used INTEGER DEFAULT 0,
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
```

### Alter Existing Tables

```sql
-- Add company_id to existing tables
ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
ALTER TABLE employees ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
ALTER TABLE shifts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
ALTER TABLE audit_logs ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
ALTER TABLE whatsapp_audits ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);

-- Add indexes for performance
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_shifts_company ON shifts(company_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_whatsapp_audits_company ON whatsapp_audits(company_id);

-- Add unique constraints for codes per company
ALTER TABLE contracts ADD UNIQUE(company_id, code);
```

---

## E. RLS POLICIES (Template)

### For All Business Tables (contracts, employees, shifts, audit_logs, whatsapp_audits)

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "rls_<table>_select" ON <table_name>
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

-- INSERT
CREATE POLICY "rls_<table>_insert" ON <table_name>
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

-- UPDATE
CREATE POLICY "rls_<table>_update" ON <table_name>
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

-- DELETE
CREATE POLICY "rls_<table>_delete" ON <table_name>
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );
```

Apply to: contracts, employees, shifts, audit_logs, whatsapp_audits (5 tables)

---

## F. KEY CODE SNIPPETS

### useOperationsData.js - Add Filtering

```javascript
// BEFORE
const contracts = await supabase.from('contracts').select('*');

// AFTER
const { company } = useAuth();
const contracts = await supabase
  .from('contracts')
  .select('*')
  .eq('company_id', company.id);
```

### Forms - Auto-inject company_id

```javascript
// BEFORE
await db.entities.Contract.create(data);

// AFTER
const { company } = useAuth();
await db.entities.Contract.create({
  ...data,
  company_id: company.id
});
```

### AuthContext - Add company

```javascript
// Add to state
const [company, setCompany] = useState(null);

// In checkUserAuth:
const { data: membership } = await supabase
  .from('company_users')
  .select('*, company:companies(*)')
  .eq('user_id', currentUser.id)
  .single();

if (membership?.company) {
  setCompany(membership.company);
} else {
  setAuthError({ type: 'activation_required' });
}
```

---

## G. DATA MIGRATION SQL

### Step 1: Create first company
```sql
INSERT INTO companies (name, slug, status, plan, created_by)
VALUES ('Original Company', 'original', 'active', 'pro', 
  (SELECT id FROM auth.users LIMIT 1))
RETURNING id;

-- Note: Save the returned UUID as $COMPANY_ID for next steps
```

### Step 2: Link existing data
```sql
UPDATE contracts SET company_id = $COMPANY_ID WHERE company_id IS NULL;
UPDATE employees SET company_id = $COMPANY_ID WHERE company_id IS NULL;
UPDATE shifts SET company_id = $COMPANY_ID WHERE company_id IS NULL;
UPDATE audit_logs SET company_id = $COMPANY_ID WHERE company_id IS NULL;
UPDATE whatsapp_audits SET company_id = $COMPANY_ID WHERE company_id IS NULL;
UPDATE profiles SET company_id = $COMPANY_ID WHERE company_id IS NULL;
```

### Step 3: Create memberships
```sql
INSERT INTO company_users (company_id, user_id, role)
SELECT $COMPANY_ID, id, role
FROM profiles
WHERE role IN ('admin', 'user');
```

---

## H. TESTING CHECKLIST

### Before Production Deployment

```
✅ Database
  [ ] New tables created and populated
  [ ] company_id added to all business tables
  [ ] Data migration complete for existing company
  [ ] Indexes created on company_id columns
  [ ] RLS policies created but NOT enabled yet

✅ Application Code
  [ ] AuthContext updated with company context
  [ ] useOperationsData filters by company_id
  [ ] All forms auto-inject company_id
  [ ] No console errors when loading pages

✅ Page Functionality
  [ ] Dashboard loads (with filtered data)
  [ ] Appalti creates, reads, updates, deletes (with company_id)
  [ ] Dipendenti creates, reads, updates, deletes (with company_id)
  [ ] Turni creates, reads, updates, deletes (with company_id)
  [ ] Buchi displays filtered gaps
  [ ] ResocontoMensile filters by company
  [ ] Reports filter by company

✅ RLS Enforcement
  [ ] Enable RLS on all tables
  [ ] Test: User A cannot see User B's data
  [ ] Test: User with no company gets error
  [ ] Test: Cross-company queries blocked
  [ ] Monitor Supabase logs for RLS denials

✅ Activation Flow
  [ ] /activate page loads
  [ ] Invalid code shows error
  [ ] Valid code creates company
  [ ] User becomes admin of new company
  [ ] Redirect to onboarding works

✅ Onboarding Flow
  [ ] /onboarding loads
  [ ] Company name can be changed
  [ ] Team member invite form works
  [ ] Redirect to dashboard succeeds

✅ Performance
  [ ] Queries with company_id filter fast
  [ ] No N+1 query problems
  [ ] Load testing with 100+ companies in DB
```

---

## I. DEPLOYMENT SEQUENCE

### Production Rollout (Day 1)

```
1. Backup production database
2. Deploy schema changes (Phase 1-2)
3. Run data migration (Phase 2)
4. Verify all data has company_id
5. Deploy app code (Phase 3-5)
6. Test application with existing company
7. Enable RLS policies (Phase 6)
8. Deploy new pages (Phase 7-8)
9. Smoke test full flow
10. Monitor for errors
```

### Rollback Plan (If issues)

```
1. Disable RLS
2. Revert app code
3. Restore database from backup
4. Investigate
5. Retry after fixes
```

---

## J. ESTIMATED EFFORT BREAKDOWN

| Component | Effort | Risk | Notes |
|-----------|--------|------|-------|
| Database schema | 3-4 hours | Medium | SQL migrations, testing RLS |
| Data migration | 1-2 hours | Low | Straightforward SQL, has rollback |
| AuthContext | 5-6 hours | High | Complex state management |
| useOperationsData | 3-4 hours | High | Central to entire app |
| Forms (3 files) | 1.5 hours | Low | Straightforward changes |
| New pages (2 files) | 4-5 hours | Medium | Activation complex, onboarding simple |
| Admin UI updates | 2-3 hours | Low | UI-only changes |
| Testing | 4-6 hours | High | RLS testing tricky |
| Documentation | 2-3 hours | Low | Straightforward |
| **TOTAL** | **26-33 hours** | - | ~1 dev week |

---

## K. SUCCESS CRITERIA

✅ System is ready for multi-tenant deployment when:

1. **Data Isolation**
   - User A cannot see User B's contracts/employees/shifts
   - This is enforced at RLS level, not just app level
   - Tested with multiple companies in DB

2. **Company Activation**
   - New customer can activate with license code
   - Company created and user added as admin
   - User can access only that company's data

3. **Backward Compatibility**
   - Existing company still works exactly as before
   - All existing data preserved and accessible
   - No breaking changes to user workflows

4. **Performance**
   - Queries with company_id filter perform well
   - No N+1 problems introduced
   - Load test with 10+ companies passes

5. **Security**
   - RLS policies enforced at database level
   - No data leakage between tenants possible
   - Audit logs track all access

---

**Analysis Complete. Ready for Implementation Approval.**
