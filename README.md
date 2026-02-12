# Outlook Inbox Automation

Automated email organization system for Outlook using Microsoft Graph API.

## 🚀 Quick Start

### First Time Setup
1. Ensure you have authenticated (token in `o365_token.txt`)
2. Test with dry-run:
   ```bash
   python smart_organizer.py --dry-run --batch-size 50 --max-batches 1
   ```

### Daily Usage

**Recommended: Smart Organizer** (Local)
```bash
# Process 200 emails at a time
python smart_organizer.py --batch-size 200
```

**GitHub Actions** (Automatic)
- Runs daily at 00:00 UTC
- Processes 200 newest emails
- Uses `inbox_organizer.py`

## 📁 Key Files

- **`smart_organizer.py`** ⭐ - Optimized script with batching & state management
- **`inbox_organizer.py`** - GitHub Actions script (200 emails/day)
- **`outlook_manager.py`** - Folder management & reset tools
- **`HANDOVER.md`** - Complete documentation

## 🎯 Features

✅ Smart batching (200 emails/batch)  
✅ Priority-based filtering (Statements before Transactions)  
✅ State management (resume capability)  
✅ Dry-run mode for testing  
✅ Detailed logging  

## 📋 Filter Priority

1. **VIB Statements** → `02_Statements/VIB/[CardType]`
2. **VIB Transactions** → `01_Banking_OTP/VIB`
3. **Other Banks** → `01_Banking_OTP/[Bank]`
4. **General Statements** → `02_Statements`
5. **App Notifications** → `03_Apps_Notifications`

## 🛠 Common Commands

```bash
# Dry-run test
python smart_organizer.py --dry-run --batch-size 100 --max-batches 1

# Process small batch
python smart_organizer.py --batch-size 100 --max-batches 1

# Process entire inbox
python smart_organizer.py --batch-size 200

# Reset state
python smart_organizer.py --reset-state

# Reset all emails to inbox
python outlook_manager.py  # Choose option 4
```

## 📖 Documentation

See [HANDOVER.md](HANDOVER.md) for complete documentation.

---

**Version:** 2.0 (Smart Batching)  
**Last Updated:** 2026-02-12
