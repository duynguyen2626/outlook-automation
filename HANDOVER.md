# Outlook Automation - Project Handover

## 📌 Hiện trạng dự án
Dự án đã thiết lập thành công nền tảng để quản lý Outlook Inbox bằng **Microsoft Graph API** và đã được tối ưu hóa để xử lý lượng mail lớn (8000+).

### Những gì đã làm được:
1. **Xác thực (Auth)**: Đã cấu hình Azure App và cơ chế **OAuth2 Device Code Flow**. Token được lưu vào `o365_token.txt`.
2. **Tự động hóa (GitHub Actions)**: Đã thiết lập Workflow để chạy script hàng ngày (00:00 UTC). Secrets đã được set up (`CLIENT_ID`, `O365_TOKEN`).
3. **Quản lý Folder**: Script có khả năng tạo cây thư mục chuẩn (`01_Banking_OTP`, `02_Statements`, `03_Apps_Notifications`) và các subfolders theo ngân hàng.
4. **Chức năng Reset**: Có script chuyên dụng để đưa toàn bộ mail từ các folder đã dọn về lại Inbox để làm lại từ đầu.
5. **✨ Smart Organizer (MỚI)**: Script tối ưu với batching, priority filtering, và state management.

## ✅ Đã giải quyết (v2.0)
1. **Performance Issue**: Đã thay thế `limit=None` bằng batching thông minh (200 emails/batch).
2. **VIB Classification**: Đã tách riêng logic cho Statements (SAO KE) và Transactions (GIAO DICH) với priority-based filtering.
3. **Resume Capability**: Có state tracking để tiếp tục từ vị trí cũ nếu bị gián đoạn.

## 🛠 Cấu trúc file

### Scripts chính:
- **`smart_organizer.py`** ⭐ (KHUYÊN DÙNG): Script tối ưu với batching, dry-run mode, và state management.
- **`inbox_organizer.py`**: Script cho GitHub Actions (xử lý 200 emails/ngày).
- **`outlook_manager.py`**: Quản lý folder, reset, và login.
- **`vibe_clean.py`**: Script thử nghiệm cũ (không khuyên dùng).

### Files hỗ trợ:
- **`.organizer_state.json`**: Lưu trạng thái xử lý (tự động tạo).
- **`organizer.log`**: Log chi tiết của smart_organizer.

## 🚀 Hướng dẫn sử dụng

### 1. Chạy lần đầu (Dry-run test)
```bash
python smart_organizer.py --dry-run --batch-size 100 --max-batches 1
```
Kiểm tra xem filter logic có đúng không mà không di chuyển mail thật.

### 2. Xử lý batch nhỏ (Test thật)
```bash
python smart_organizer.py --batch-size 100 --max-batches 1
```
Xử lý 100 emails đầu tiên để kiểm tra.

### 3. Xử lý toàn bộ inbox
```bash
python smart_organizer.py --batch-size 200
```
Xử lý tất cả emails trong inbox (200 emails/batch, không giới hạn số batch).

### 4. Reset và làm lại
```bash
python outlook_manager.py
# Chọn option 4: RESET TẤT CẢ
```

### 5. GitHub Actions (Tự động hàng ngày)
Script `inbox_organizer.py` sẽ tự động chạy mỗi ngày lúc 00:00 UTC, xử lý 200 emails mới nhất.

## 📋 Filter Rules (Priority Order)

### Priority 1: VIB Statements (Cao nhất)
- **Sender**: `info@card.vib.com.vn`
- **Keywords**: `SAO KE` + `[SUPER CARD|ONLINE PLUS|TRAVEL ELITE]`
- **Target**: `02_Statements/VIB/[CardType]`

### Priority 2: VIB Transactions
- **Sender**: `@vib.com.vn`
- **Keywords**: `GIAO DICH`, `OTP`, `THONG BAO`
- **Target**: `01_Banking_OTP/VIB`

### Priority 3-5: Other banks, Statements, Notifications
Xem chi tiết trong `smart_organizer.py` hoặc `inbox_organizer.py`.

## 💡 Tips
- Luôn chạy **dry-run** trước khi xử lý batch lớn.
- Kiểm tra `organizer.log` để debug nếu có vấn đề.
- State file (`.organizer_state.json`) giúp resume nếu bị gián đoạn.
- Dùng `--reset-state` để xóa state và bắt đầu lại từ đầu.

---
*Updated by Antigravity on 2026-02-12 - v2.0 with Smart Batching*
