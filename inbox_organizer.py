from O365 import Account, FileSystemTokenBackend
import sys
import os
import logging

# =================================================================================================
# CẤU HÌNH (SẼ ĐƯỢC OVERWRITE BỞI ENV VAR NẾU CHẠY TRÊN GITHUB)
# =================================================================================================
CLIENT_ID = os.environ.get('CLIENT_ID', '1e2438e2-8dd6-414a-a9be-69bc182b438b')

# Log level
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# RULE DEFINITIONS
# 'target' can be 'folder' or 'parent/child'
RULES = [
    # --- 01 BANKING OTP & TRANSACTIONS (Ưu tiên chia theo bank) ---
    {
        'target': '01_Banking_OTP/VIB',
        'keywords': ['GIAO DICH', 'THAY DOI THIET BI', 'Mã xác thực'],
        'senders': ['@vib.com.vn']
    },
    {
        'target': '01_Banking_OTP/Sacombank',
        'keywords': ['THONG BAO GIAO DICH PHAT SINH', 'SACOMBANK'],
        'senders': ['info@sacombank.com.vn']
    },
    # ... (các bank khác) ...
    {
        'target': '01_Banking_OTP/Techcombank',
        'keywords': ['Techcombank', 'TCB', '[TCB] PAN:', 'Mã xác thực'],
        'senders': ['@techcombank.com.vn', 'srv.notihub.mail@techcombank.com.vn']
    },
    {
        'target': '01_Banking_OTP/TPBank',
        'keywords': ['TPBank'],
        'senders': ['@tpbank.com.vn']
    },
    {
        'target': '01_Banking_OTP/Momo',
        'keywords': ['Momo'],
        'senders': ['@momo.vn']
    },

    # --- 02 STATEMENTS (Chỉ dành cho SAO KÊ và DƯ NỢ) ---
    {
        'target': '02_Statements/VIB/SuperCard',
        'keywords': ['SUPER CARD', 'DƯ NỢ'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'target': '02_Statements/VIB/OnlinePlus',
        'keywords': ['ONLINE PLUS', 'DƯ NỢ'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'target': '02_Statements/VIB/TravelElite',
        'keywords': ['TRAVEL ELITE', 'TRAVEL ÉLITE', 'DƯ NỢ'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'target': '02_Statements',
        'keywords': ['sao kê', 'statement', 'phiếu báo', 'biên lai', 'ebill', 'hóa đơn', 'invoice', 'payment receipt'],
        'senders': []
    },
    
    # --- 03 NOTIFICATIONS ---
    {
        'target': '03_Apps_Notifications',
        'keywords': ['notification', 'alert', 'digest', 'bảo mật', 'đăng nhập', 'security alert', 'login alert'],
        'senders': ['@github.com', '@facebookmail.com', 'no-reply', 'noreply', '@trello.com', '@slack.com', '@jira.com', '@atlassian.net']
    }
]

def setup_token_from_env():
    env_token = os.environ.get('O365_TOKEN')
    if env_token:
        logger.info("Found O365_TOKEN in environment variables. Writing to file...")
        try:
            with open('o365_token.txt', 'w') as f:
                f.write(env_token)
        except Exception as e:
            logger.error(f"Failed to write token file: {e}")

def get_account():
    setup_token_from_env()
    token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
    account = Account((CLIENT_ID, None), token_backend=token_backend)
    
    if not account.is_authenticated:
        logger.error("Account not authenticated! Please run locally first to generate token.")
        return None
    return account

def get_or_create_folder(root_folder, path_str):
    """
    Hỗ trợ lấy hoặc tạo folder theo đường dẫn dạng 'A/B'
    """
    parts = path_str.split('/')
    current_folder = root_folder
    
    for part in parts:
        try:
            # Tìm trong danh sách con
            subfolders = list(current_folder.get_folders(limit=100))
            found = next((f for f in subfolders if f.name.lower() == part.lower()), None)
            
            if found:
                current_folder = found
            else:
                logger.info(f"Creating folder: {part} under {current_folder.name}")
                current_folder = current_folder.create_child_folder(part)
        except Exception as e:
            logger.error(f"Error getting/creating folder '{part}': {e}")
            return None
            
    return current_folder

def check_rule(message, rule):
    # Lấy thông tin mail
    sender = message.sender.address.lower() if message.sender else ""
    subject = message.subject.lower() if message.subject else ""
    
    # Logic mới: Nếu rule có cả sender và keywords, PHẢI thỏa mãn cả hai (hoặc 1 trong các sender VÀ 1 trong các keyword)
    # Nếu chỉ có 1 cái thì chỉ check cái đó.
    
    match_sender = True
    if rule['senders']:
        match_sender = any(s.lower() in sender for s in rule['senders'])
        
    match_keyword = True
    if rule['keywords']:
        match_keyword = any(k.lower() in subject for k in rule['keywords'])
        
    return match_sender and match_keyword

def organize_inbox(account):
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    print("--- ĐANG QUÉT TOÀN BỘ INBOX ---")
    
    # Lấy tổng số mail để tính % (nếu có thể)
    try:
        total_count = inbox.get_messages(limit=1).count
        print(f"Tổng số mail dự kiến: {total_count}")
    except:
        total_count = 0
        print("Đang quét mail...")

    # Sử dụng generator để tiết kiệm bộ nhớ
    query = inbox.get_messages(limit=None, download_attachments=False)
    
    folder_cache = {}
    count_processed = 0
    count_moved = 0
    count_failed = 0
    
    for msg in query:
        count_processed += 1
        
        # In progress gọn nhẹ trên cùng 1 dòng
        if total_count > 0:
            percent = (count_processed / total_count) * 100
            print(f"\rTiến độ: {percent:.1f}% ({count_processed}/{total_count}) | Đã di chuyển: {count_moved} | Lỗi: {count_failed}", end="", flush=True)
        else:
            print(f"\rĐã quét: {count_processed} | Đã di chuyển: {count_moved} | Lỗi: {count_failed}", end="", flush=True)

        found_rule = False
        for rule in RULES:
            if check_rule(msg, rule):
                target_path = rule['target']
                
                if target_path not in folder_cache:
                    folder_cache[target_path] = get_or_create_folder(inbox, target_path)
                
                target_folder = folder_cache[target_path]
                
                if target_folder:
                    try:
                        if msg.move(target_folder):
                            count_moved += 1
                            found_rule = True
                            break 
                    except Exception:
                        count_failed += 1
                        break
        
    print(f"\n\nHOÀN TẤT!")
    print(f"- Tổng số mail đã quét: {count_processed}")
    print(f"- Số mail được di chuyển: {count_moved}")
    print(f"- Số mail gặp lỗi: {count_failed}")

def main():
    account = get_account()
    if account:
        organize_inbox(account)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
