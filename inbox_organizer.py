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
        'target': '01_Banking_OTP/Sacombank',
        'keywords': ['THONG BAO GIAO DICH PHAT SINH', 'SACOMBANK'],
        'senders': ['info@sacombank.com.vn']
    },
    {
        'target': '01_Banking_OTP/VIB',
        'keywords': ['VIB'],
        'senders': ['@vib.com.vn']
    },
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
    {
        'target': '01_Banking_OTP', # Các mail OTP khác không thuộc bank trên
        'keywords': ['OTP', 'xác thực', 'mã giao dịch', 'transaction', 'SecureCode', 'verify your account'],
        'senders': ['noreply@google.com']
    },
    
    # --- 02 STATEMENTS (Chi tiết cho VIB) ---
    {
        'target': '02_Statements/VIB/SuperCard',
        'keywords': ['SAO KE THE TIN DUNG VIB SUPER CARD THANG', 'SAO KE DIEM THUONG THE TIN DUNG VIB SUPER CARD'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'target': '02_Statements/VIB/OnlinePlus',
        'keywords': ['VIB ONLINE PLUS 2IN1'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'target': '02_Statements/VIB/TravelElite',
        'keywords': ['TRAVEL ÉLITE', 'TRAVEL ELITE'],
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
    # Check Senders
    sender = message.sender.address.lower() if message.sender else ""
    for s in rule['senders']:
        if s.lower() in sender:
            return True
            
    # Check Keywords in Subject
    subject = message.subject.lower() if message.subject else ""
    for k in rule['keywords']:
        if k.lower() in subject:
            return True
            
    return False

def organize_inbox(account):
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    logger.info("Scanning Inbox for unorganized emails...")
    
    # Lấy 100 mail mới nhất (Inbox của user đã được dọn trống ở bước Reset nên 100 là đủ)
    messages = list(inbox.get_messages(limit=100, download_attachments=False))
    
    # Cache folders
    folder_cache = {}

    count_moved = 0
    for msg in messages:
        moved = False
        for rule in RULES:
            if check_rule(msg, rule):
                target_path = rule['target']
                
                # Lấy folder từ cache hoặc tạo mới
                if target_path not in folder_cache:
                    folder_cache[target_path] = get_or_create_folder(inbox, target_path)
                
                target_folder = folder_cache[target_path]
                
                if target_folder:
                    logger.info(f"Moving '{msg.subject}' -> {target_path}")
                    try:
                        if msg.move(target_folder):
                            count_moved += 1
                            moved = True
                            break # Move once per message
                    except Exception as e:
                        logger.error(f"Error moving message: {e}")
        
    logger.info(f"Organization complete. Moved {count_moved} emails.")

def main():
    account = get_account()
    if account:
        organize_inbox(account)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
