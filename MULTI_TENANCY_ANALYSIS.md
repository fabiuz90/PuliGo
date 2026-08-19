# Multi-Tenant Architecture Analysis & Migration Plan
## PuliGo SaaS Transformation

**Analysis Date:** 2026-08-13  
**Current State:** Single-company application  
**Target State:** Multi-tenant SaaS with company isolation  

---

## EXECUTIVE SUMMARY

PuliGo is currently a **single-tenant application** where all data belongs to one implicit company. The application has:
- **No company_id column** in any table
- **No tenant concept** in the database or application layer
- **Role-based RLS policies** (admin/user) with no organization isolation
- **Centralized data access** through `useOperationsData` hook that fetches all records
- **Shared Supabase project** but single-company data model

To transform into a multi-tenant SaaS, we need to:
1. Add `company_id` to all business tables
2. Create new tenant management tables
3. Update all RLS policies to enforce company isolation
4. Modify all data access patterns to filter by company
5. Implement company onboarding/license activation flow
6. Create admin infrastructure for managing companies

---

## SECTION A: EXISTING DATABASE ANALYSIS

### Current Tables (6 tables)

| Table | Type | Purpose | Company-Aware | Requires company_id |
|-------|------|---------|---------------|--------------------|
| `profiles` | User | User auth profile + role | ❌ No | ⚠️ Yes (join) |
| `contracts` | Business | Cleaning contracts/appalti | ❌ No | ✅ Yes |
| `employees` | Business | Employee records | ❌ No | ✅ Yes |
| `shifts` | Business | Shift assignments | ❌ No | ✅ Yes |
| `whatsapp_audits` | Audit | WhatsApp messaging log | ❌ No | ✅ Yes |
| `audit_logs` | Audit | General audit trail | ❌ No | ✅ Yes |

### Current Data Relationships

```
profiles (users via Supabase Auth)
  ↓ user_id
  
audit_logs (tracks actions)
contract_ids [array], employees, shifts

contracts
  ← service_requirements (JSON array)
  ← monthly_revenue

employees
  ← contract_ids [array] (many-to-many)
  ← hourly_cost

shifts
  → employee_id (FK to employees)
  → contract_id (FK to contracts)
```

### Current RLS Policies

**Pattern:** All tables use role-based access control

```json
{
  "create": { "$or": [{"role": "user"}, {"role": "admin"}] },
  "read": { "$or": [{"role": "user"}, {"role": "admin"}] },
  "update": { "$or": [{"role": "user"}, {"role": "admin"}] },
  "delete": { "$or": [{"role": "user"}, {"role": "admin"}] }
}
```

**Issue:** Users with the same role can access ALL data from ANY company once the table is shared.

### Data Access Patterns (Critical)

**Central Hook: `useOperationsData.js`**
- Fetches ALL contracts, employees, shifts without filtering
- Used by 9 major pages: Dashboard, Appalti, Dipendenti, Turni, Buchi, ResocontoMensile, MarginiAppalti, Statistiche, Admin

```javascript
// Current pattern (NO FILTERING)
const contracts = await supabase.from('contracts').select('*');
const employees = await supabase.from('employees').select('*');
const shifts = await supabase.from('shifts').select('*');
```

**CRUD Operations:**
- `db.entities.Contract.create()` - Appalti.jsx
- `db.entities.Contract.update()` - Appalti.jsx
- `db.entities.Contract.delete()` - Appalti.jsx
- `db.entities.Employee.create()` - Dipendenti.jsx
- `db.entities.Employee.update()` - Dipendenti.jsx
- `db.entities.Employee.delete()` - Dipendenti.jsx
- Direct Supabase shifts operations in useOperationsData.js:
  - `createShiftOpt()`, `updateShiftOpt()`, `deleteShiftOpt()`
  - `bulkCreateShiftsOpt()`, `deleteShiftsOpt()`
- `db.entities.AuditLog.create()` - Turni.jsx, WhatsAppProgramModal.jsx
- `db.entities.WhatsappAudit.create()` - WhatsAppProgramModal.jsx

---

## SECTION B: PROPOSED NEW TABLES

### Tenant Management Tables

#### 1. `companies` (New)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier
  status TEXT DEFAULT 'active' -- active, suspended, trial, inactive
  license_code TEXT UNIQUE,   -- Activation code (nullable until activated)
  plan TEXT DEFAULT 'starter', -- starter, pro, enterprise
  subscription_status TEXT,   -- active, expired, payment_failed
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  metadata JSONB -- Store custom company data
);
```

#### 2. `licenses` (New)
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Activation code (e.g., PG-XXXX-XXXX-XXXX)
  company_id UUID REFERENCES companies,
  plan TEXT NOT NULL,
  seats_included INTEGER DEFAULT 5,
  issued_at TIMESTAMP DEFAULT now(),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'pending' -- pending, activated, expired, revoked
);
```

#### 3. `company_users` / `memberships` (New)
```sql
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member', -- admin, manager, member
  invited_email TEXT, -- Email if not yet registered
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(company_id, user_id)
);
```

#### 4. `subscriptions` (New - Optional, for future billing)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE REFERENCES companies(id),
  plan TEXT NOT NULL,
  seats_used INTEGER DEFAULT 0,
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP,
  status TEXT, -- active, past_due, canceled
  stripe_subscription_id TEXT
);
```

### Updated Existing Tables

All business tables get `company_id`:

#### Modified `contracts`
```sql
ALTER TABLE contracts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_contracts_company ON contracts(company_id);
-- Add constraint to ensure uniqueness per company if needed
```

#### Modified `employees`
```sql
ALTER TABLE employees ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_employees_company ON employees(company_id);
```

#### Modified `shifts`
```sql
ALTER TABLE shifts ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_shifts_company ON shifts(company_id);
```

#### Modified `audit_logs`
```sql
ALTER TABLE audit_logs ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
```

#### Modified `whatsapp_audits`
```sql
ALTER TABLE whatsapp_audits ADD COLUMN company_id UUID NOT NULL REFERENCES companies(id);
CREATE INDEX idx_whatsapp_audits_company ON whatsapp_audits(company_id);
```

#### Modified `profiles`
```sql
ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
-- Nullable because user might not be assigned to a company yet
CREATE INDEX idx_profiles_company ON profiles(company_id);
```

---

## SECTION C: AUTHENTICATION & COMPANY ASSIGNMENT

### Current Flow
```
Login → Supabase Auth → fetch profile → set user context
```

### Proposed Flow
```
Login → Supabase Auth → fetch profile → fetch company_users → determine company(s)
        → If no company: show activation/license code entry
        → If company assigned: set company context
```

### Activation Code Flow (New)
```
1. New customer purchases → receives license code (PG-XXXX-XXXX-XXXX)
2. Customer lands on /activate (NEW PAGE)
3. Enters license code
4. System validates license (in licenses table)
5. If valid:
   - Creates new company record
   - Links license to company
   - Creates company_users entry (first user as admin)
   - Redirects to /onboarding
6. Company_id stored in AuthContext
7. All subsequent queries filtered by this company_id
```

### Context Enhancement Required

**Current AuthContext:**
```javascript
{ user, isAuthenticated, role, ... }
```

**New AuthContext:**
```javascript
{ 
  user, 
  isAuthenticated, 
  role,
  company,           // NEW: { id, name, plan, status }
  companies,         // NEW: [{ id, name, role }] - all companies user has access to
  isCompanySelected, // NEW: boolean
  selectCompany(id), // NEW: method to switch company
  activationRequired // NEW: boolean - if no company assigned
}
```

---

## SECTION D: LICENSE & ACTIVATION SYSTEM

### License Code Format
- Pattern: `PG-XXXX-XXXX-XXXX` (16 chars total)
- Random generation using crypto
- Issued to company, used once to activate tenant

### Activation Process

**Page: `/activate` (NEW)**
1. Form with license code input
2. Submit validates code against `licenses` table:
   - Code exists
   - Status = 'pending'
   - Not yet expired
   - Not already activated
3. On success:
   - Create `companies` record
   - Update `licenses.status = 'activated'`
   - Update `licenses.company_id`
   - Create `company_users` record
   - Create initial `audit_log` entry
   - Redirect to `/onboarding`

**Page: `/onboarding` (NEW)**
1. Setup wizard (optional)
2. Import existing data or start fresh
3. Invite team members
4. Redirect to dashboard

### License Validation
```sql
-- Check if license is valid for activation
SELECT * FROM licenses 
WHERE code = $1 
AND status = 'pending' 
AND (expires_at IS NULL OR expires_at > now());
```

---

## SECTION E: ROW LEVEL SECURITY (RLS) STRATEGY

### New RLS Pattern

**For business tables (contracts, employees, shifts, etc.):**

```sql
-- Create RLS policy for company-based isolation
CREATE POLICY company_isolation ON contracts
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
```

**For profiles table:**
```sql
CREATE POLICY own_profile ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

**For company_users table:**
```sql
CREATE POLICY see_own_company_members ON company_users
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY admin_manage_members ON company_users
  USING (
    (company_id, user_id) IN (
      SELECT company_id, user_id FROM company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    (company_id, user_id) IN (
      SELECT company_id, user_id FROM company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**For companies table (READ ONLY):**
```sql
CREATE POLICY view_own_company ON companies
  USING (
    id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );
```

### RLS Policy Changes Needed

1. **Remove** old role-based checks
2. **Add** company_id checks to all business tables
3. **Create** helper views for common patterns
4. **Test** with cross-company scenarios to prevent leakage

---

## SECTION F: APPLICATION ARCHITECTURE CHANGES

### Files Requiring Modification

#### Core Authentication (3 files)
- **AuthContext.jsx** - Add company context, activation flow
- **Login.jsx** - Modify to check for company assignment
- **Register.jsx** - New company creation on first signup (optional)

#### New Pages (3 files)
- **Activate.jsx** - License code entry and validation
- **Onboarding.jsx** - Company setup wizard
- **CompanySelector.jsx** - Switch between companies if user in multiple

#### Central Data Access (1 critical file)
- **useOperationsData.js** - Add company_id filter to ALL queries

#### Pages Using useOperationsData (9 files - ALL need minimal change)
- Dashboard.jsx
- Appalti.jsx
- Dipendenti.jsx
- Turni.jsx
- Buchi.jsx
- ResocontoMensile.jsx
- MarginiAppalti.jsx
- Statistiche.jsx
- Admin.jsx

Changes: None needed if useOperationsData handles filtering!

#### Forms (3 files - ALL need minimal/no change)
- ContractForm.jsx
- EmployeeForm.jsx
- ShiftForm.jsx

Changes: Add company_id to created records automatically

#### Database Layer (2 files)
- **db.js** - Update tableMap, add company context awareness
- **supabase.js** - No changes needed

#### Configuration (1 file)
- **AuthContext.jsx** - Add company context provider

#### Admin Panel (1 file)
- **Admin.jsx** - New section for company settings (future)

---

## SECTION G: QUERY & COMPONENT CHANGES

### Critical Change: useOperationsData.js

**Current (ALL data):**
```javascript
const [contracts] = await Promise.all([
  supabase.from('contracts').select('*'),
  ...
]);
```

**New (Company-filtered):**
```javascript
const { company } = useAuth();

const [contracts] = await Promise.all([
  supabase
    .from('contracts')
    .select('*')
    .eq('company_id', company.id), // ← ADD THIS
  ...
]);
```

**Apply to all queries:**
- `contracts` query
- `employees` query
- `shifts` query (multiple places)

### Forms: Auto-set company_id

**Current (ContractForm.jsx):**
```javascript
const save = async data => {
  await db.entities.Contract.create(data);
};
```

**New:**
```javascript
const { company } = useAuth();

const save = async data => {
  await db.entities.Contract.create({
    ...data,
    company_id: company.id // ← ADD THIS
  });
};
```

**Apply to:**
- ContractForm.jsx
- EmployeeForm.jsx
- ShiftForm.jsx
- Any create operation

---

## SECTION H: DATA MIGRATION STRATEGY

### Phase 1: Prepare (No Data Loss)

1. **Create new tables** (companies, licenses, company_users, subscriptions)
2. **Add company_id columns** to existing tables (nullable initially)
3. **No deletions or renames** - old structure intact
4. **Create indexes** on company_id for performance

### Phase 2: Migrate Current Company

1. **Create first company:**
   ```sql
   INSERT INTO companies (name, slug, status) 
   VALUES ('Existing Company', 'existing-company', 'active')
   RETURNING id;
   ```

2. **Link existing data:**
   ```sql
   UPDATE contracts SET company_id = $1 WHERE company_id IS NULL;
   UPDATE employees SET company_id = $1 WHERE company_id IS NULL;
   UPDATE shifts SET company_id = $1 WHERE company_id IS NULL;
   UPDATE audit_logs SET company_id = $1 WHERE company_id IS NULL;
   UPDATE whatsapp_audits SET company_id = $1 WHERE company_id IS NULL;
   UPDATE profiles SET company_id = $1 WHERE company_id IS NULL;
   ```

3. **Create admin user mapping:**
   ```sql
   INSERT INTO company_users (company_id, user_id, role)
   SELECT $1, id, 'admin' FROM profiles WHERE role = 'admin';
   
   INSERT INTO company_users (company_id, user_id, role)
   SELECT $1, id, 'member' FROM profiles WHERE role = 'user';
   ```

4. **Create license for existing company (optional):**
   ```sql
   INSERT INTO licenses (code, company_id, status)
   VALUES ('PG-EXISTING-LEGACY', $1, 'activated')
   ```

### Phase 3: Make company_id NOT NULL

1. **After all data migrated:**
   ```sql
   ALTER TABLE contracts ALTER COLUMN company_id SET NOT NULL;
   ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;
   -- etc.
   ```

2. **Create unique constraints if needed:**
   ```sql
   ALTER TABLE contracts ADD UNIQUE(company_id, code);
   ```

---

## SECTION I: DATA LEAKAGE PREVENTION

### Security Concerns & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| User queries all data without company filter | 🔴 CRITICAL | RLS policies enforce company_id check |
| useOperationsData has no company context | 🔴 CRITICAL | Add company_id to useAuth + filter all queries |
| Forms create records without company_id | 🔴 CRITICAL | Automatically set company_id in form submission |
| User switches company via URL param | 🟡 HIGH | Company selection via context only, validate in backend |
| Admin user sees all companies' data | 🟡 HIGH | RLS still filters by company_users relationship |
| Old profile.company_id NULL records | 🟡 HIGH | Migrate all in Phase 2, add NOT NULL constraint |
| Direct Supabase API calls bypass company context | 🔴 CRITICAL | RLS policies handle this at DB level |
| Audit logs don't track company access | 🟡 MEDIUM | Include company_id in all audit logs |

### Testing Strategy

**Before deployment:**
1. Test RLS policies with cross-company user accounts
2. Verify useOperationsData respects company_id
3. Check audit logs capture company_id
4. Verify admin cannot access other company data
5. Test license activation creates proper isolation
6. Load test with multiple companies in DB

---

## SECTION J: RISKS & BREAKING CHANGES

### Breaking Changes (Must Handle)

1. **useOperationsData requires company context**
   - Will fail if AuthContext doesn't provide company
   - Solution: Check context early, show error if missing

2. **All CRUD operations need company_id**
   - Old code that doesn't set company_id will violate FK constraint
   - Solution: Automatic company_id injection in forms & db functions

3. **User roles change semantics**
   - Old: 'admin' = admin of entire app
   - New: 'admin' = admin of their company only
   - Solution: Distinguish between 'super_admin' (app) and 'admin' (company)

4. **ProfileForm, settings pages assume single company**
   - Solution: Update to support company selection

### Compatibility Issues

| Issue | Component | Fix |
|-------|-----------|-----|
| useOperationsData throws without company | 9 pages | Add conditional loading state |
| Forms fail without company_id | 3 forms | Auto-inject from context |
| Admin page scope changes | Admin.jsx | Decide: manage company users or app users? |
| Reports assume single company | Dashboard, Statistiche | Add company filter (automatic via useOperationsData) |
| Export filenames generic | All pages | Add company name to filename |

### Migration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| company_id NOT NULL before migration complete | 🟡 MEDIUM | 🔴 HIGH | Database backup before Phase 2 |
| Orphaned records (no company_id) | 🟡 MEDIUM | 🟡 MEDIUM | Verify all records migrated before NOT NULL |
| RLS policy blocks legitimate access | 🟡 MEDIUM | 🔴 HIGH | Extensive testing before production |
| User confused by license activation | 🟠 LOW | 🟡 MEDIUM | Clear UX/documentation |
| Performance regression from RLS | 🟠 LOW | 🟡 MEDIUM | Index on company_id, monitor queries |

---

## SECTION K: RECOMMENDED PHASED IMPLEMENTATION PLAN

### Phase 1: Database Preparation (Week 1)
**Goal:** Prepare database, no app changes yet

**Tasks:**
1. ✅ Create new tables: `companies`, `licenses`, `company_users`, `subscriptions`
2. ✅ Add `company_id` columns to: contracts, employees, shifts, audit_logs, whatsapp_audits, profiles
3. ✅ Create indexes on all `company_id` columns
4. ✅ Create RLS policies (policies disabled until Phase 3)
5. ✅ Database backup

**Risk:** Low - read-only operations still work

**Rollback:** Drop new columns/tables, restore from backup

---

### Phase 2: Migrate Existing Data (Week 1)
**Goal:** Link existing single company to new infrastructure

**Tasks:**
1. ✅ Create first company record
2. ✅ Migrate all existing data to company_id
3. ✅ Create company_users entries for all existing profiles
4. ✅ Verify data integrity
5. ✅ Keep RLS policies disabled

**Risk:** Medium - must verify all records migrated

**Rollback:** `UPDATE ... SET company_id = NULL`

---

### Phase 3: AuthContext & Company Context (Week 2)
**Goal:** Add company awareness to application

**Tasks:**
1. ✅ Enhance AuthContext to include company
2. ✅ Create useCompany() hook
3. ✅ Update AuthProvider to fetch company_users on login
4. ✅ Update all pages to use company context
5. ✅ Test: Verify company_id flows through app

**Risk:** Medium - auth flow changes might break login

**Rollback:** Revert AuthContext changes

---

### Phase 4: Update useOperationsData (Week 2)
**Goal:** Add company filtering to central data hook

**Tasks:**
1. ✅ Add company_id filter to contracts query
2. ✅ Add company_id filter to employees query
3. ✅ Add company_id filter to shifts queries (multiple places)
4. ✅ Test each page with filtered data
5. ✅ Test: Verify data isolation works

**Risk:** Medium - if filter wrong, pages break or show no data

**Rollback:** Remove all .eq('company_id', ...) filters

---

### Phase 5: Update Forms & CRUD (Week 2)
**Goal:** Ensure created records belong to correct company

**Tasks:**
1. ✅ Update ContractForm to auto-set company_id
2. ✅ Update EmployeeForm to auto-set company_id
3. ✅ Update ShiftForm to auto-set company_id
4. ✅ Update db.entities to auto-set company_id for audit logs
5. ✅ Test: Create record, verify company_id set

**Risk:** Low - straightforward changes

**Rollback:** Remove company_id assignments

---

### Phase 6: Enable RLS Policies (Week 3)
**Goal:** Enforce company isolation at database level

**Tasks:**
1. ✅ Enable RLS on all tables
2. ✅ Test: User cannot see other company data
3. ✅ Test: Cross-company queries blocked
4. ✅ Monitor: Watch for RLS blocking legitimate queries
5. ✅ Database backup

**Risk:** High - RLS errors block all queries if policies wrong

**Rollback:** Disable RLS, revert policy definitions

---

### Phase 7: Activation & Onboarding (Week 3)
**Goal:** Implement license activation flow

**Tasks:**
1. ✅ Create Activate.jsx page
2. ✅ Create license validation endpoint/function
3. ✅ Create Onboarding.jsx page
4. ✅ Test: Activate license → creates company → access app
5. ✅ Test: License code generation

**Risk:** Medium - activation flow must be bulletproof

**Rollback:** Keep old signup flow, new flow optional

---

### Phase 8: Admin Panel Updates (Week 4)
**Goal:** Add company management UI

**Tasks:**
1. ✅ Update Admin.jsx to show company settings
2. ✅ Add user role management (per company)
3. ✅ Add company suspension/status management
4. ✅ Add license management UI (future: billing integration)
5. ✅ Add company switcher UI (if user in multiple)

**Risk:** Low - UI only, business logic already done

**Rollback:** Keep old Admin.jsx

---

### Phase 9: Documentation & Testing (Week 4)
**Goal:** Prepare for production

**Tasks:**
1. ✅ Write API documentation for license activation
2. ✅ Write RLS policy documentation
3. ✅ Create database migration scripts
4. ✅ Create rollback scripts
5. ✅ QA full multi-tenant flow

**Risk:** Low - documentation phase

---

### Phase 10: Production Deployment (Week 5)
**Goal:** Go live with multi-tenant system

**Tasks:**
1. ✅ Final production database backup
2. ✅ Deploy schema changes (migrations)
3. ✅ Deploy Phase 2 migration (existing company)
4. ✅ Deploy app code (all phases 3-8)
5. ✅ Verify existing company still works
6. ✅ Test new customer activation flow
7. ✅ Monitor for issues

**Risk:** Critical - production data live

**Rollback:** Restore database backup, revert app code

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      MULTI-TENANT ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

                         SHARED SUPABASE PROJECT
                         (One PostgreSQL Database)

┌─────────────────────────────────────────────────────────────────┐
│                        TENANT MANAGEMENT LAYER                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   companies      │  │   licenses       │  │subscriptions │  │
│  │  (tenant records)│  │ (activation)     │  │ (billing)    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│         ↑                      ↑                                  │
│         └──────────────────────┴──────────────────────┐           │
│                                                       │           │
│  ┌──────────────────────────────────────┐      ┌─────▼────────┐ │
│  │    company_users (memberships)       │──────│ (join table) │ │
│  │  Connects: company ↔ user ↔ role     │      └─────────────┘ │
│  └──────────────────────────────────────┘                       │
│                  ↑                                                │
└──────────────────┼────────────────────────────────────────────────┘
                   │
                   │ (RLS joins on company_id via company_users)
                   │
┌──────────────────▼────────────────────────────────────────────────┐
│               BUSINESS DATA LAYER (ISOLATED BY COMPANY)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   contracts      │  │   employees      │  │    shifts        │ │
│  │ (all have        │  │  (all have       │  │ (all have        │ │
│  │  company_id)     │  │   company_id)    │  │  company_id)     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │               AUDIT & LOGGING LAYER                            │ │
│  │  ┌──────────────────┐  ┌────────────────────────────────────┐  │ │
│  │  │  audit_logs      │  │  whatsapp_audits                   │  │ │
│  │  │ (company_id)     │  │ (company_id)                       │  │ │
│  │  └──────────────────┘  └────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              USER PROFILE LAYER                                  │ │
│  │  profiles (auth.users) + company_id                             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AuthContext (with company awareness)                              │
│  ├─ user (Supabase Auth)                                           │
│  ├─ company (from companies table)                                 │
│  ├─ companies (all user has access to)                             │
│  └─ selectCompany(id)                                              │
│         │                                                           │
│         ├─→ useOperationsData (filters by company_id)              │
│         │    ├─ contracts.eq('company_id', company.id)             │
│         │    ├─ employees.eq('company_id', company.id)             │
│         │    └─ shifts.eq('company_id', company.id)                │
│         │                                                           │
│         ├─→ Pages (Dashboard, Appalti, etc)                        │
│         │   └─ All see filtered data automatically                 │
│         │                                                           │
│         └─→ Forms (ContractForm, etc)                              │
│             └─ Auto-set company_id on create                       │
│                                                                     │
│  New Flows:                                                         │
│  ├─ /activate (license code entry)                                 │
│  ├─ /onboarding (company setup)                                    │
│  └─ Company Selector (if user in multiple)                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

                            RLS POLICIES
                     (Enforce isolation at DB level)

  Every business table has RLS policy:
  ┌────────────────────────────────────────────────┐
  │ SELECT/UPDATE/DELETE only if:                  │
  │   company_id IN (                              │
  │     SELECT company_id FROM company_users       │
  │     WHERE user_id = auth.uid()                 │
  │   )                                            │
  └────────────────────────────────────────────────┘
  
  = User can only access data from their company(ies)
  = Even if app code has bug, DB protects data
```

---

## SUMMARY TABLE: FILES TO MODIFY

| Phase | File | Change Type | Complexity |
|-------|------|-------------|-----------|
| 1 | Database | Schema migration | High |
| 2 | Database | Data migration | High |
| 3 | AuthContext.jsx | Add company context | Medium |
| 3 | Login.jsx | Add company check | Low |
| 3 | Register.jsx | New signup flow (optional) | Medium |
| 4 | Activate.jsx | NEW - License activation | Medium |
| 4 | Onboarding.jsx | NEW - Company setup | Low |
| 5 | useOperationsData.js | Add company_id filter | Medium |
| 6 | ContractForm.jsx | Auto-inject company_id | Low |
| 6 | EmployeeForm.jsx | Auto-inject company_id | Low |
| 6 | ShiftForm.jsx | Auto-inject company_id | Low |
| 7 | db.js | Add company awareness (optional) | Low |
| 8 | Admin.jsx | Add company settings UI | Low |
| 8 | Common components | Company selector (optional) | Low |

---

## NEXT STEPS

### For Approval:
1. ✅ Review architecture diagram
2. ✅ Review table designs
3. ✅ Review RLS strategy
4. ✅ Approve phased timeline
5. ✅ Clarify activation flow requirements

### For Implementation:
1. Create database migration scripts
2. Start Phase 1 (database preparation)
3. Proceed through phases sequentially
4. Test thoroughly before production

---

**Analysis Complete.**  
**Ready for Phase 1 initiation upon approval.**
