# Outlook Automation - Project Handover

## 📌 Hiện trạng dự án
Dự án đã thiết lập thành công nền tảng để quản lý Outlook Inbox bằng **Microsoft Graph API**. 

### Những gì đã làm được:
1.  **Xác thực (Auth)**: Đã cấu hình Azure App và cơ chế **OAuth2 Device Code Flow**. Token được lưu vào `o365_token.txt`.
2.  **Tự động hóa (GitHub Actions)**: Đã thiết lập Workflow để chạy script hàng ngày (00:00 UTC). Secrets đã được set up (`CLIENT_ID`, `O365_TOKEN`).
3.  **Quản lý Folder**: Script có khả năng tạo cây thư mục chuẩn (`01_Banking_OTP`, `02_Statements`, `03_Apps_Notifications`) và các subfolders theo ngân hàng.
4.  **Chức năng Reset**: Có script chuyên dụng để đưa toàn bộ mail từ các folder đã dọn về lại Inbox để làm lại từ đầu.

## ⚠️ Vấn đề hiện tại (Blockers)
1.  **Số lượng mail cực lớn (8,000+)**: Thư viện `O365` khi gọi `get_messages(limit=None)` trên Inbox lớn dễ bị treo hoặc mất kết nối API giữa chừng.
2.  **Độ chính xác của bộ lọc (Rules)**: 
    *   Các mail thông báo giao dịch (Transactions) và Sao kê (Statements) của cùng một ngân hàng (như VIB) rất dễ bị nhầm lẫn nếu chỉ lọc theo `Sender`.
    *   Cần logic lọc chặt chẽ hơn (kết hợp Subject và Sender).
3.  **Vấn đề Local - Sync**: Đôi khi mail đã di chuyển trên server nhưng Outlook App cập nhật chậm, dẫn đến thông tin hiển thị không đồng nhất.

## 🛠 Hướng dẫn cho Agent tiếp theo
1.  **Cấu trúc file**:
    *   `outlook_manager.py`: Chứa các hàm quản lý folder, reset, và login.
    *   `inbox_organizer.py`: Script chính dùng cho GitHub Actions.
    *   `vibe_clean.py`: Script thử nghiệm dọn dẹp theo Batch (đang cần tối ưu thêm).
2.  **Chiến lược tiếp theo**:
    *   **Phân trang tốt hơn**: Nên sử dụng tham số `order_by='receivedDateTime desc'` và xử lý từng trang 100-200 mail để tránh quá tải.
    *   **Lọc đa tầng**: Ưu tiên lọc các mail có chứa từ khóa "SAO KE" (Statement) trước, sau đó mới đến các mail "GIAO DICH" (Transaction).
    *   **Skip logic**: Cần một cơ chế ghi nhớ các mail ID đã xử lý để không quét lại từ đầu mỗi lần chạy.

## 🚀 Các lệnh quan trọng
*   `python outlook_manager.py`: Menu quản lý (Chọn 4 để Reset sạch bài).
*   `python inbox_organizer.py`: Chạy phân loại mail (Cần check lại giới hạn `limit`).

---
*Handover created by Antigravity on 2026-02-12.*
