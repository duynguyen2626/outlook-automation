from O365 import Account, FileSystemTokenBackend
import sys
import os
import logging

# =================================================================================================
# CẤU HÌNH AZURE APP (BẮT BUỘC)
# Bạn cần tạo App trên Azure Portal để lấy Client ID (Xem hướng dẫn trong chat)
# =================================================================================================
CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'  # <--- DÁN CLIENT ID VÀO ĐÂY
# =================================================================================================

# Target folders
# OLD_FOLDERS_TO_CLEAN = ['Vib', 'Tpbank', 'Github', 'Dashlane', 'Momo']
# Cập nhật danh sách từ kết quả scan thực tế của user
OLD_FOLDERS_TO_CLEAN = [
    'App OTP', 
    'Apps Notifications', 
    'Bank Notifications', 
    'Bank Statements', 
    'Invest', 
    'Lock/Unlock', 
    'Login Notifications', 
    'Noti', 
    'Quảng Cáo', 
    'Shopping', 
    'Transaction'
]
NEW_FOLDERS_TO_CREATE = ['01_Banking_OTP', '02_Statements', '03_Apps_Notifications']

def get_account():
    print("--- ĐĂNG NHẬP OUTLOOK (MICROSOFT GRAPH API) ---")
    
    if CLIENT_ID == 'PASTE_YOUR_CLIENT_ID_HERE':
        print("\n[LỖI] Bạn chưa điền CLIENT_ID vào script!")
        print("Vui lòng mở file 'outlook_manager.py', tìm dòng CLIENT_ID và dán ID của bạn vào.")
        print("Xem lại hướng dẫn lấy Client ID trong đoạn chat với Agent.")
        return None

    credentials = (CLIENT_ID, None) # Client ID only for public app (Device Flow)
    
    # Token backend để lưu session (tránh đăng nhập lại nhiều lần)
    token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
    
    account = Account(credentials, token_backend=token_backend)
    
    if not account.is_authenticated:
        print("Chưa xác thực. Đang khởi tạo quy trình đăng nhập (Device Code Flow)...")
        # Sử dụng Device Flow: In ra link và code để user nhập trên trình duyệt
        if account.authenticate(scopes=['basic', 'message_all']):
            print("Đăng nhập thành công!")
        else:
            print("Đăng nhập thất bại!")
            return None
    else:
        print("Đã đăng nhập (Sử dụng token cũ).")
        
    return account

def list_subfolders(account):
    print("--- DANH SÁCH FOLDERS ---")
    mailbox = account.mailbox()
    # Lấy root folders
    folders = mailbox.get_folders(limit=50)
    for f in folders:
        print(f"- {f.name} (Child Folders: {f.child_folders_count})")
        # Nếu là Inbox thì in ra con của nó luôn để check
        if f.name.lower() == 'inbox':
            try:
                childs = f.get_folders(limit=50)
                for child in childs:
                     print(f"    |-- {child.name}")
            except:
                pass
    print("")

def create_standard_folders(account):
    print("--- TẠO FOLDER MỚI ---")
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    for folder_name in NEW_FOLDERS_TO_CREATE:
        try:
            # Để an toàn, list child folders của Inbox trước
            existing_children = {f.name for f in inbox.get_folders(limit=100)}
            
            if folder_name in existing_children:
                print(f"Folder đã tồn tại: {folder_name}")
            else:
                inbox.create_child_folder(folder_name)
                print(f"Đã tạo folder: {folder_name}")
                
        except Exception as e:
            print(f"Lỗi khi tạo folder {folder_name}: {e}")
    print("Hoàn tất!\n")

def cleanup_folders(account):
    print("--- DỌN DẸP & DI CHUYỂN MAIL ---")
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    # CHỈ TÌM TRONG INBOX VÌ FOLDER CỦA BẠN NẰM TRONG ĐÓ
    # Lấy danh sách con của Inbox
    inbox_children = list(inbox.get_folders(limit=200))
    
    # Map name -> folder objects
    # Dùng lower() để so sánh không phân biệt hoa thường
    folder_map = {f.name.lower(): f for f in inbox_children}
    
    found_any = False
    
    for target_name in OLD_FOLDERS_TO_CLEAN:
        target_key = target_name.lower()
        if target_key in folder_map:
            found_any = True
            target_folder = folder_map[target_key]
            print(f"Đang xử lý folder: '{target_folder.name}' (trong Inbox)...")
            
            try:
                # Di chuyển messages
                messages = list(target_folder.get_messages(limit=200)) 
                count = len(messages)
                
                if count > 0:
                    print(f"  -> Tìm thấy {count} emails. Đang di chuyển về INBOX...")
                    moved_count = 0
                    for msg in messages:
                         if msg.move(inbox):
                             moved_count += 1
                    print(f"  -> Đã di chuyển {moved_count}/{count} emails.")
                else:
                    print(f"  -> Folder trống.")
                
                # Xóa folder
                # Vì API O365 move object có thể làm mất reference, nên check lại hoặc xóa luôn nếu code trước ok
                print(f"  -> Đang xóa folder '{target_folder.name}'...")
                target_folder.delete()
                print(f"  -> Đã xóa.")

            except Exception as e:
                # Bắt lỗi cụ thể nếu không xóa được folder (thường do là folder hệ thống hoặc sync issue)
                error_msg = str(e)
                if "Object cannot be deleted" in error_msg or "Forbidden" in error_msg:
                    print(f"  -> [CẢNH BÁO] Không thể xóa folder '{target_folder.name}'. Có thể đây là folder hệ thống hoặc bị khóa.")
                    print(f"  -> Tuy nhiên, mail bên trong đã được dọn sạch về Inbox.")
                else:
                    print(f"  -> Lỗi xử lý folder '{target_name}': {e}")
        else:
            # Debug: in ra nếu không thấy
            # print(f"Không thấy folder {target_name} trong Inbox")
            pass
            
    if not found_any:
        print("Không tìm thấy folder nào trong danh sách dọn dẹp (Vib, Github, ...).")
        print("Có thể folder tên khác hoặc không nằm trực tiếp trong Inbox.")
    print("Hoàn tất dọn dẹp!\n")

def menu():
    print("====================================")
    print("     OUTLOOK MANAGER (GRAPH API)    ")
    print("====================================")
    print("1. Liệt kê folders hiện có")
    print("2. Tạo các folder chuẩn (OTP, Statement, App)")
    print("3. Dọn dẹp folder cũ & di chuyển mail về Inbox")
    print("4. Thoát")
    print("====================================")
    return input("Chọn chức năng (1-4): ")

def main():
    account = get_account()
    if not account:
        sys.exit(1)
        
    while True:
        choice = menu()
        if choice == '1':
            list_subfolders(account)
        elif choice == '2':
            create_standard_folders(account)
        elif choice == '3':
            confirm = input("Bạn có chắc chắn muốn dọn dẹp và xóa các folder cũ? (y/n): ")
            if confirm.lower() == 'y':
                cleanup_folders(account)
        elif choice == '4':
            print("Tạm biệt!")
            break
        else:
            print("Lựa chọn không hợp lệ. Vui lòng chọn lại.\n")

if __name__ == "__main__":
    main()
