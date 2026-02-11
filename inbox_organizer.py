from O365 import Account, FileSystemTokenBackend
import sys
import os
import logging
import json
import re

# =================================================================================================
# CẤU HÌNH (SẼ ĐƯỢC OVERWRITE BỞI ENV VAR NẾU CHẠY TRÊN GITHUB)
# =================================================================================================
CLIENT_ID = os.environ.get('CLIENT_ID', '1e2438e2-8dd6-414a-a9be-69bc182b438b')
# Không cần Client Secret vì dùng Device Flow/Public Client

# Log level
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# RULE DEFINITIONS
RULES = {
    '01_Banking_OTP': {
        'keywords': ['OTP', 'xác thực', 'mã giao dịch', 'transaction', 'SecureCode', 'verify your account', 'THONG BAO GIAO DICH PHAT SINH'],
        'senders': ['@vib.com.vn', '@techcombank.com.vn', '@momo.vn', '@tpbank.com.vn', 'info@sacombank.com.vn', 'noreply@google.com'],
    },
    '02_Statements': {
        'keywords': ['sao kê', 'statement', 'phiếu báo', 'biên lai', 'ebill', 'hóa đơn', 'invoice', 'payment receipt'],
        'senders': [],
    },
    '03_Apps_Notifications': {
        'keywords': ['notification', 'alert', 'digest', 'bảo mật', 'đăng nhập', 'security alert', 'login alert'],
        'senders': ['@github.com', '@facebookmail.com', 'no-reply', 'noreply', '@trello.com', '@slack.com', '@jira.com', '@atlassian.net'],
    }
}

def setup_token_from_env():
    """
    Nếu chạy trên GitHub Actions, token sẽ được lưu trong biến môi trường O365_TOKEN.
    Hàm này sẽ ghi nó ra file o365_token.txt để thư viện O365 sử dụng.
    """
    env_token = os.environ.get('O365_TOKEN')
    if env_token:
        logger.info("Found O365_TOKEN in environment variables. Writing to file...")
        try:
            with open('o365_token.txt', 'w') as f:
                f.write(env_token)
        except Exception as e:
            logger.error(f"Failed to write token file: {e}")

def get_account():
    # Setup token if in CI/CD
    setup_token_from_env()
    
    token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
    account = Account((CLIENT_ID, None), token_backend=token_backend)
    
    if not account.is_authenticated:
        logger.error("Account not authenticated! Please run locally first to generate token.")
        return None
    
    return account

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
    
    # Lấy 50 mail mới nhất (hoặc nhiều hơn tùy nhu cầu, cẩn thận timeout nếu quá nhiều)
    messages = inbox.get_messages(limit=100, download_attachments=False)
    
    # Pre-fetch destination folders to avoid API calls in loop
    dest_folders = {}
    for folder_name in RULES.keys():
        f = inbox.get_folder(folder_name=folder_name)
        if f:
             dest_folders[folder_name] = f
        else:
             # Create if not exists
             logger.info(f"Creating missing folder: {folder_name}")
             dest_folders[folder_name] = inbox.create_child_folder(folder_name)

    count_moved = 0
    for msg in messages:
        moved = False
        for folder_name, rule in RULES.items():
            if check_rule(msg, rule):
                logger.info(f"Moving '{msg.subject}' -> {folder_name}")
                try:
                    msg.move(dest_folders[folder_name])
                    count_moved += 1
                    moved = True
                    break # Move once per message
                except Exception as e:
                    logger.error(f"Error moving message: {e}")
        
        if not moved:
            # logger.info(f"Skipping: {msg.subject}")
            pass

    logger.info(f"Organization complete. Moved {count_moved} emails.")

def main():
    account = get_account()
    if account:
        organize_inbox(account)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
