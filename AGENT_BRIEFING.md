# 🤖 AGENT BRIEFING - cleanMail Project
**Date**: February 12, 2026  
**Status**: Development Paused - Critical Issue Investigation  
**PR**: https://github.com/rei6868/outlook-automation/pull/1

---

## 📖 QUICK START - Read These Files First

### 1️⃣ **MUST READ** (in order):
1. **[HANDOVER_ISSUES.md](HANDOVER_ISSUES.md)** ⭐ START HERE
   - Critical issue: VCB Loyalty email detection problem
   - Why code found only 2 emails when user sees many
   - Full investigation results and hypotheses
   - **READ THIS FIRST** to understand the blocker

2. **[HANDOVER.md](HANDOVER.md)** - Overall project context
   - Project goal: Automate Outlook inbox organization
   - User requirements and preferences
   - Historical decisions and pivots

3. **[README.md](README.md)** - Technical documentation
   - How to run the Flask UI
   - Rule configuration format
   - API usage and examples

### 2️⃣ **Core Code Files**:
4. **[rules_config.py](rules_config.py)** (~60 lines)
   - Current active rule: Vietcombank cashback
   - Rule schema and configuration format
   
5. **[rule_executor.py](rule_executor.py)** (~250 lines)
   - Core engine: `check_rule()`, `execute_rule()`
   - Pagination logic (fixed)
   - Folder creation, matching logic

6. **[app.py](app.py)** (~150 lines)
   - Flask web server with 8 API routes
   - Integration point between UI and rule engine

7. **[templates/index.html](templates/index.html)** (~400 lines)
   - Web UI with debug tools
   - Rule test/run interface

### 3️⃣ **Debug Scripts** (reference only):
- `debug_emails.py` - Sample first 20 inbox emails
- `deep_search.py` - Deep pagination search (used for investigation)
- `query_search.py` - Query API attempt (failed, fallback implemented)
- `check_tree.py` - Folder structure inspector

---

## 🎯 PROJECT CONTEXT

### What We're Building
**Goal**: Web UI to organize 8,000+ Outlook emails using custom rules

**Architecture**:
```
User (Web Browser)
    ↓
Flask UI (localhost:5000)
    ↓
Rule Executor (rule_executor.py)
    ↓
Microsoft Graph API (via O365 library)
    ↓
Outlook Mailbox
```

### What Works ✅
- Flask UI fully functional
- Rule engine with pagination (handles 8000+ emails)
- Batch processing (configurable, default 200/batch)
- Successfully moved 14 emails:
  - 2 VCB cashback emails → VCBANK/HOANTIEN
  - 12 VIB emails → VIB/[3 subfolders]

### What's Blocked 🔴
**Critical Issue**: VCB Loyalty Email Detection

**Problem Statement**:
- User sees **many** "HOÀN TIỀN" (cashback) emails in Outlook from "VCB Loyalty"
- Code scanned 1400+ inbox emails, found **ZERO** additional emails
- Only 2 emails moved (the only 2 that were actually in Inbox)

**Where are the missing emails?**
- Hypothesis 1: In **Archive folder** (not Inbox) ← Most likely
- Hypothesis 2: Different Outlook account
- Hypothesis 3: User viewing "All folders" search (mixing locations)

**Evidence**:
```
Scanned: 1,400 inbox emails
Found VCB emails: 18 total
  - Cashback (HOÀN TIỀN): 2 ✅ (moved successfully)
  - Transaction notifications: 18 ❌ (wrong type)
  
VCBANK/HOANTIEN folder: 2 emails ✅
  Subject: "THÔNG BÁO HOÀN TIỀN THẺ VIETCOMBANK VISA SIGNATURE"
  From: Loyalty@info.vietcombank.com.vn
```

**Next Agent's Mission**: 
👉 Determine actual location of user's HOÀN TIỀN emails and implement solution

---

## 🔧 TECHNICAL STACK

**Dependencies**:
```
O365==4.10.5          # Microsoft Graph API
Flask==2.3.3          # Web framework
python-dateutil       # Date handling
```

**Authentication**:
- OAuth2 with FileSystemTokenBackend
- Token stored in: `o365_token.txt` (valid)
- Personal Microsoft account

**Current Rule** (Vietcombank cashback):
```python
{
    'id': 'vcbank_hoantien',
    'name': 'Vietcombank - Hoàn Tiền',
    'target': 'VCBANK/HOANTIEN',
    'keywords': ['THÔNG BÁO HOÀN TIỀN', 'VIETCOMBANK'],  # ALL must match (AND)
    'senders': ['vietcombank.com.vn'],  # At least ONE matches (OR)
    'exclude_keywords': [],  # NONE can match (NOT)
    'source_folder': 'Inbox',  # ← Currently hardcoded
    'active': True
}
```

---

## 🚀 HOW TO CONTINUE

### Option A: Investigate Email Location (Recommended First)

**Step 1**: Ask user to check Archive folder
```python
# Test script to check Archive
from O365 import Account
account = Account(credentials=(...))
mailbox = account.mailbox()

# Try Archive folder
archive = mailbox.get_folder(folder_name='Archive')
messages = archive.get_messages(limit=100)

for msg in messages:
    if 'HOÀN TIỀN' in msg.subject.upper() and 'VIETCOMBANK' in msg.subject.upper():
        print(f"Found in Archive: {msg.subject}")
        print(f"From: {msg.sender.address}")
```

**Step 2**: If found in Archive → Implement solution below

### Option B: Add Source Folder Support

**Required Changes**:

1. **Update `rules_config.py`**:
   ```python
   'source_folder': 'Archive',  # Change from 'Inbox'
   ```

2. **Update `rule_executor.py`** - `execute_rule()` method:
   - Already has `source_folder` parameter ✅
   - Currently uses: `folder = mailbox.get_folder(folder_name=rule['source_folder'])`
   - **Should work as-is** if rule config updated

3. **Update `templates/index.html`** - Add UI dropdown:
   ```html
   <select id="sourceFolder">
     <option value="Inbox">Inbox</option>
     <option value="Archive">Archive</option>
   </select>
   ```

4. **Update `app.py`** - API endpoint:
   ```python
   @app.route('/api/run-rule', methods=['POST'])
   def run_rule():
       data = request.json
       source_folder = data.get('source_folder', 'Inbox')  # Add this
       # Pass to execute_rule()
   ```

### Option C: Search All Folders

Create a new utility to scan all folders:
```python
def find_emails_in_all_folders(keywords, senders):
    results = {}
    for folder in mailbox.get_folders():
        matches = scan_folder(folder, keywords, senders)
        if matches:
            results[folder.name] = matches
    return results
```

---

## 📊 CURRENT STATE

**Git Branch**: `feature/flask-ui-rule-engine-vcb-issue`  
**Commit**: `aa46103`  
**Files Changed**: 27 files, +2782 insertions  

**Folder Structure**:
```
Inbox (8,000+ emails)
├── VCBANK/
│   └── HOANTIEN/ (2 emails) ✅
├── VIB/
│   ├── SAO_KE_DIEM_THUONG/ (2 emails) ✅
│   ├── SAO_KE_SUPER_CARD/ (2 emails) ✅
│   └── SAO_KE_TRAVEL_ELITE/ (5 emails) ✅
└── VIB/ (3 notification emails at root) ✅

Archive (?)
└── ??? HOÀN TIỀN emails likely here ???
```

**Flask Server**: Stopped (to conserve quota)  
**To restart**: `python app.py` → http://localhost:5000

---

## ⚠️ KNOWN LIMITATIONS

1. **Folder Rename Not Supported**: O365 API has no `.save()` or `.update()` method
2. **QueryBuilder API Failed**: `query.on_attribute()` doesn't exist in O365 v4.10.5
3. **Rate Limits**: Microsoft Graph API has quotas, avoid excessive scanning
4. **No State Persistence**: If interrupted, must restart from beginning

---

## 🎯 IMMEDIATE NEXT STEPS (Priority Order)

### Priority 1: Resolve VCB Issue ⭐
1. Run check script on Archive folder (see Option A above)
2. Confirm with user: "Are your HOÀN TIỀN emails in Archive folder?"
3. If YES → Update rule source_folder to 'Archive'
4. Test with small batch (max_emails=100)
5. If successful → Run full batch to move all Archive emails

### Priority 2: Enhance UI
- Add source folder dropdown (Inbox/Archive)
- Show email count before running
- Add progress indicator for long scans

### Priority 3: More Banks
- Implement Techcombank rules
- Implement TPBank rules
- Resume VIB sub-classification (3 emails pending)

---

## 💬 QUESTIONS TO ASK USER

1. **"Bạn có thể check trong Outlook xem các email HOÀN TIỀN đang ở folder nào không? Inbox hay Archive?"**
   - This is the blocking question

2. **"Nếu ở Archive, bạn có muốn tôi chuyển tất cả emails HOÀN TIỀN từ Archive vào folder VCBANK/HOANTIEN không?"**

3. **"Bạn có cần thêm rules cho ngân hàng nào khác không? (Techcombank, TPBank, etc.)"**

---

## 🔗 USEFUL COMMANDS

```bash
# Start Flask UI
python app.py

# Check folder structure
python check_tree.py

# Debug first 20 emails in Inbox
python debug_emails.py

# Deep search (scan 1400 emails)
python deep_search.py

# List all folders
python -c "from rule_executor import RuleExecutor; r = RuleExecutor(); print(r.list_folders())"

# Check Archive folder
python -c "from O365 import Account; from O365.utils import FileSystemTokenBackend; token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt'); account = Account(('<CLIENT_ID>', '<CLIENT_SECRET>'), token_backend=token_backend); mailbox = account.mailbox(); archive = mailbox.get_folder(folder_name='Archive'); print(f'Archive: {archive.get_message_count()} emails')"
```

---

## 📝 FINAL NOTES

- **Development paused** to conserve Microsoft Graph API quota
- **PR created**: Ready for review but waiting on investigation
- **User expectation**: Many HOÀN TIỀN emails should be organized, not just 2
- **Likely root cause**: Emails in Archive, code only searched Inbox
- **Solution**: Add Archive folder support (straightforward, ~30 min work)

**Your mission**: Find those missing HOÀN TIỀN emails and get them organized! 🎯

---

**Good luck! Start with [HANDOVER_ISSUES.md](HANDOVER_ISSUES.md) for full context.** 🚀
