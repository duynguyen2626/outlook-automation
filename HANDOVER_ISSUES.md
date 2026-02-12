# HANDOVER ISSUES - cleanMail Project
**Date**: February 12, 2026  
**Status**: Development Paused - Multiple Failures, Quota Conservation

## 🔴 CRITICAL ISSUE: VCB Loyalty Email Detection

### Problem Statement
**Symptoms:**
- User can see multiple Vietcombank "HOÀN TIỀN" (cashback) emails in Outlook across multiple months (12/2025, 10/2025, 09/2025, 08/2025)
- User screenshot shows sender as "VCB Loyalty" (display name)
- Code searches found **ZERO** matching emails in inbox despite exhaustive scanning

### Investigation Results

#### What Was Found ✅
- **2 emails successfully moved** to `VCBANK/HOANTIEN` folder
  - Subject: "THÔNG BÁO HOÀN TIỀN THẺ VIETCOMBANK VISA SIGNATURE"
  - Sender: `Loyalty@info.vietcombank.com.vn` (display name: "VCB Loyalty")
  - These were the only 2 HOÀN TIỀN emails that existed in Inbox

#### What Was NOT Found ❌
Despite multiple search attempts:

1. **debug_emails.py**: Scanned first 20 inbox emails
   - Result: 0 Vietcombank emails found

2. **deep_search.py**: Batch scanned first 1,400 inbox emails
   - Keywords: 'VIETCOMBANK' + 'HOÀN TIỀN'
   - Result: 0 matching emails found

3. **query_search.py**: Attempted full mailbox query
   - Found 18 Vietcombank emails in first 500
   - BUT: All 18 are "Thông báo giao dịch thẻ" (transaction notifications)
   - None are "HOÀN TIỀN" (cashback notifications)
   - Sender: `info@info.vietcombank.com.vn`

### Hypotheses for Discrepancy

#### Most Likely Causes:
1. **Archive Folder**: Emails user sees are in Archive, not Inbox
   - Code only searches Inbox by default
   - User may be viewing "All Folders" search in Outlook

2. **Different Account**: User screenshot may be from different Outlook account
   - Current authentication: Personal Microsoft account
   - User may have multiple work/personal accounts

3. **Display Name Confusion**: "VCB Loyalty" is display name
   - Actual sender address varies:
     - Cashback: `Loyalty@info.vietcombank.com.vn` ✅ (found 2)
     - Transactions: `info@info.vietcombank.com.vn` ❌ (found 18, wrong type)

4. **Search Depth**: Emails very deep in inbox (beyond 1,400 scanned)
   - Inbox has 8,000+ emails total
   - Resource/quota limits prevented full scan

### Current Rule Configuration
```python
{
    'id': 'vcbank_hoantien',
    'name': 'Vietcombank - Hoàn Tiền',
    'target': 'VCBANK/HOANTIEN',
    'keywords': ['THÔNG BÁO HOÀN TIỀN', 'VIETCOMBANK'],
    'senders': ['vietcombank.com.vn'],  # Broad domain match
    'exclude_keywords': [],
    'source_folder': 'Inbox',
    'active': True
}
```

**Rule Status**: ✅ Working correctly for emails that ARE in Inbox

---

## 📋 Other Known Issues

### 1. O365 API Limitations
- **Folder Rename Not Supported**: `Folder` object has no `.save()` or `.update()` method
  - Cannot rename folders via API
  - Workaround: Create new folder, move emails, delete old folder (not implemented)

### 2. QueryBuilder API Error
```python
# Attempted query-based search failed:
query = mailbox.new_query().on_attribute('subject').contains('VIETCOMBANK')
# Error: 'QueryBuilder' object has no attribute 'on_attribute'
```
- O365 library version: 4.10.5
- API documentation may be outdated
- Fallback: Manual pagination search implemented

### 3. Pagination Performance
- Scanning 8,000+ emails requires many API calls
- Each batch: 200 emails (configurable)
- Risk of hitting Microsoft Graph API rate limits
- No progress persistence (restart from beginning on failure)

---

## ✅ What's Working

### Flask Web UI
- **URL**: http://localhost:5000
- **Status**: Fully functional with 8 endpoints

#### Features:
- ⚙️ Settings panel: Batch size control (default 200)
- ✅ Rule management: Test/Run buttons
- 🔍 Debug tools: Email inspector, keyword search
- 📁 Folder manager: List folders with counts
- 🟢 Real-time auth status indicator

### Rule Engine (`rule_executor.py`)
- **Pagination**: ✅ Fixed - scans all emails until completion
- **Batch processing**: ✅ Dynamic inbox shrinking handled correctly
- **Folder creation**: ✅ Nested paths supported (e.g., 'VCBANK/HOANTIEN')
- **Matching logic**: ✅ AND for keywords, OR for senders, NOT for excludes
- **Debug logging**: ✅ Logs every match/mismatch with details

### Rule Configuration (`rules_config.py`)
- ✅ 1 active rule: Vietcombank cashback
- ⏳ VIB rules: Commented out (pending)

### Successful Operations
1. **Vietcombank HOÀN TIỀN**: 2 emails moved to VCBANK/HOANTIEN
2. **VIB Consolidation**: 12 emails organized:
   - VIB/SAO_KE_DIEM_THUONG (2 emails)
   - VIB/SAO_KE_SUPER_CARD (2 emails)
   - VIB/SAO_KE_TRAVEL_ELITE (5 emails)
   - VIB root (3 notification emails)

---

## 🔧 Technical Stack

### Dependencies
```
O365==4.10.5
Flask==2.3.3
python-dateutil==2.8.2
```

### Authentication
- **Method**: OAuth2 with FileSystemTokenBackend
- **Token**: o365_token.txt (valid)
- **Account**: Personal Microsoft account
- **Scope**: Mail.ReadWrite, Mail.Send, offline_access

### File Structure
```
cleanMail/
├── app.py                    # Flask web server (8 routes)
├── rule_executor.py          # Core rule engine (~250 lines)
├── rules_config.py           # Rule definitions
├── templates/
│   └── index.html            # Web UI (~400 lines)
├── debug_emails.py           # Debug: Sample 20 emails
├── deep_search.py            # Debug: Deep inbox scan
├── query_search.py           # Debug: Query API attempt
├── check_tree.py             # Utility: Folder tree printer
├── cleanup_folders.py        # Utility: Fix nested folders
├── smart_organizer.py        # (Previous approach - deprecated?)
├── o365_token.txt            # OAuth token
└── requirements.txt          # Dependencies
```

---

## 🚧 Pending Work

### High Priority
1. **Resolve VCB Loyalty Issue**:
   - Clarify actual location of user's emails (Archive? Different account?)
   - Test rule with `source_folder='Archive'`
   - Add folder source selector to UI

2. **Add Source Folder Support**:
   - UI dropdown: Inbox / Archive / All Folders
   - Modify `execute_rule()` to accept source_folder parameter
   - Update rules_config schema

### Medium Priority
3. **Implement More Bank Rules**:
   - Vietcombank transaction notifications (separate from cashback)
   - Techcombank rules
   - TPBank rules
   - Resume VIB sub-classification

4. **Performance Optimization**:
   - State persistence (checkpoint last processed email)
   - Resume from last position on failure
   - Batch commit instead of email-by-email moves

### Low Priority
5. **UI Enhancements**:
   - Progress bar for long scans
   - Email count preview before running
   - Export rules to JSON
   - Import rules from file

---

## 📊 Statistics

### Search Coverage
- Inbox total: ~8,000 emails
- Scanned: 1,400 emails (17.5%)
- Vietcombank emails found: 20 total
  - Cashback (HOÀN TIỀN): 2 ✅
  - Transactions: 18 ❌

### Folder Organization
- VCBANK/HOANTIEN: 2 emails
- VIB: 12 emails (3 folders + root)
- Total organized: 14 emails

---

## 🎯 Recommendations for Continuation

### Immediate Actions
1. **Ask user to check Archive folder** in Outlook
   - Search: `from:vietcombank.com.vn subject:HOÀN TIỀN`
   - Note the actual folder location

2. **Test with sample email**:
   - User forwards one HOÀN TIỀN email to Inbox
   - Run rule to confirm it works
   - Inspect sender address carefully

3. **Add source_folder parameter** to UI and rules:
   ```python
   def execute_rule(rule, batch_size=200, max_emails=None, source_folder='Inbox'):
       folder = mailbox.get_folder(folder_name=source_folder)
       # ...
   ```

### Long-term Strategy
1. **Implement folder discovery**: Scan all folders for Vietcombank emails (not just Inbox)
2. **Add rule templates**: Pre-configured rules for common banks
3. **Create restore function**: Undo rule (move emails back)
4. **Add scheduling**: Auto-run rules daily/weekly (currently manual-only)

---

## 🐛 Debug Commands Used

```bash
# Sample first 20 emails
python debug_emails.py

# Deep search first 1400 emails
python deep_search.py

# Query-based search (failed, fallback to manual)
python query_search.py

# Check folder structure
python check_tree.py

# Check VCBANK/HOANTIEN folder contents
python -c "from O365 import Account; account = Account(...); mailbox = account.mailbox(); folder = mailbox.get_folder(folder_name='VCBANK').get_folder(folder_name='HOANTIEN'); print(f'{folder.name}: {folder.get_message_count()} emails')"
```

---

## 📝 Notes

### Display Name vs Email Address
- **Display Name**: What user sees in Outlook ("VCB Loyalty", "VietcomBank")
- **Email Address**: Actual sender (`Loyalty@info.vietcombank.com.vn`)
- Rule matching uses **email address only** (case-insensitive substring match)

### Keyword Matching Logic
- All keywords must be present (AND logic)
- Case-insensitive: `'VIETCOMBANK' in subject.upper()`
- Substring match: "HOÀN TIỀN" matches "THÔNG BÁO HOÀN TIỀN THẺ..."

### API Quota Concerns
- Microsoft Graph API has rate limits
- Too many failures can waste quota
- **PAUSED development to conserve quota**
- Resume only after clarifying email location

---

## 🔗 Related Files

- Main documentation: [README.md](README.md)
- Handover document: [HANDOVER.md](HANDOVER.md)
- This issue tracker: `HANDOVER_ISSUES.md`

---

**Status**: ⏸️ Paused - Awaiting user clarification on email location
**Next Step**: User to confirm whether emails are in Archive or different account
