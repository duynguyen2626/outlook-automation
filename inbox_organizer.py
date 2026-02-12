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

# =================================================================================================
# FILTER RULES (PRIORITY ORDER - LOWER NUMBER = HIGHER PRIORITY)
# =================================================================================================
RULES = [
    # ========== PRIORITY 1: STATEMENTS (MOST SPECIFIC) ==========
    {
        'name': 'VIB_SuperCard_Statement',
        'target': '02_Statements/VIB/SuperCard',
        'keywords': ['SAO KE', 'SUPER CARD'],
        'senders': ['info@card.vib.com.vn'],
        'priority': 1
    },
    {
        'name': 'VIB_OnlinePlus_Statement',
        'target': '02_Statements/VIB/OnlinePlus',
        'keywords': ['SAO KE', 'ONLINE PLUS'],
        'senders': ['info@card.vib.com.vn'],
        'priority': 1
    },
    {
        'name': 'VIB_TravelElite_Statement',
        'target': '02_Statements/VIB/TravelElite',
        'keywords': ['SAO KE', 'TRAVEL ELITE', 'TRAVEL ÉLITE'],
        'senders': ['info@card.vib.com.vn'],
        'priority': 1
    },
    
    # ========== PRIORITY 2: VIB TRANSACTIONS (LESS SPECIFIC) ==========
    {
        'name': 'VIB_Transactions',
        'target': '01_Banking_OTP/VIB',
        'keywords': ['GIAO DICH', 'THAY DOI THIET BI', 'OTP', 'THONG BAO'],
        'senders': ['@vib.com.vn'],
        'priority': 2
    },
    
    # ========== PRIORITY 3: OTHER BANKS ==========
    {
        'name': 'Sacombank_Transactions',
        'target': '01_Banking_OTP/Sacombank',
        'keywords': ['THONG BAO GIAO DICH', 'SACOMBANK'],
        'senders': ['info@sacombank.com.vn'],
        'priority': 3
    },
    {
        'name': 'Techcombank_Transactions',
        'target': '01_Banking_OTP/Techcombank',
        'keywords': ['Techcombank', 'TCB', '[TCB] PAN:', 'Ma xac thuc'],
        'senders': ['@techcombank.com.vn', 'srv.notihub.mail@techcombank.com.vn'],
        'priority': 3
    },
    {
        'name': 'TPBank_Transactions',
        'target': '01_Banking_OTP/TPBank',
        'keywords': ['TPBank'],
        'senders': ['@tpbank.com.vn'],
        'priority': 3
    },
    {
        'name': 'Momo_Transactions',
        'target': '01_Banking_OTP/Momo',
        'keywords': ['Momo'],
        'senders': ['@momo.vn'],
        'priority': 3
    },
    
    # ========== PRIORITY 4: GENERAL STATEMENTS ==========
    {
        'name': 'General_Statements',
        'target': '02_Statements',
        'keywords': ['sao ke', 'statement', 'phieu bao', 'bien lai', 'ebill', 'hoa don', 'invoice', 'payment receipt'],
        'senders': [],
        'priority': 4
    },
    
    # ========== PRIORITY 5: APP NOTIFICATIONS ==========
    {
        'name': 'App_Notifications',
        'target': '03_Apps_Notifications',
        'keywords': ['notification', 'alert', 'digest', 'bao mat', 'dang nhap', 'security alert', 'login alert'],
        'senders': ['@github.com', '@facebookmail.com', 'no-reply', 'noreply', '@trello.com', '@slack.com', '@jira.com', '@atlassian.net'],
        'priority': 5
    }
]

# Sort rules by priority
RULES.sort(key=lambda x: x['priority'])

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
    """Check if a message matches a rule (case-insensitive)"""
    try:
        sender = message.sender.address.lower() if message.sender else ""
        subject = message.subject.upper() if message.subject else ""
        
        # Check sender match
        match_sender = True
        if rule['senders']:
            match_sender = any(s.lower() in sender for s in rule['senders'])
        
        # Check keyword match (case-insensitive)
        match_keyword = True
        if rule['keywords']:
            match_keyword = any(k.upper() in subject for k in rule['keywords'])
        
        return match_sender and match_keyword
    except Exception as e:
        logger.error(f"Error checking rule: {e}")
        return False

def organize_inbox(account, batch_size=200):
    """
    Organize inbox with batching for GitHub Actions
    Processes emails in batches to avoid timeout and memory issues
    """
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    logger.info("=" * 80)
    logger.info("INBOX ORGANIZER - GITHUB ACTIONS MODE")
    logger.info("=" * 80)
    logger.info(f"Batch size: {batch_size}")
    logger.info("=" * 80)
    
    folder_cache = {}
    count_processed = 0
    count_moved = 0
    count_failed = 0
    
    try:
        # Get messages (newest first, limited batch)
        # For GitHub Actions, we process a fixed batch daily
        query = inbox.get_messages(
            limit=batch_size,
            download_attachments=False,
            order_by='receivedDateTime desc'
        )
        
        messages = list(query)
        total = len(messages)
        
        logger.info(f"Retrieved {total} messages to process")
        
        if total == 0:
            logger.info("Inbox is clean! No messages to process.")
            return
        
        # Process each message
        for idx, msg in enumerate(messages, 1):
            count_processed += 1
            
            # Progress indicator
            if idx % 10 == 0:
                logger.info(f"Progress: {idx}/{total} | Moved: {count_moved} | Failed: {count_failed}")
            
            # Check against rules (in priority order)
            matched = False
            for rule in RULES:
                if check_rule(msg, rule):
                    target_path = rule['target']
                    
                    # Get or create target folder (with caching)
                    if target_path not in folder_cache:
                        folder_cache[target_path] = get_or_create_folder(inbox, target_path)
                    
                    target_folder = folder_cache[target_path]
                    
                    if target_folder:
                        try:
                            if msg.move(target_folder):
                                count_moved += 1
                                matched = True
                                logger.debug(f"Moved: '{msg.subject[:50]}...' -> {target_path}")
                                break  # Stop checking rules once matched
                        except Exception as e:
                            logger.error(f"Error moving message: {e}")
                            count_failed += 1
                            break
        
        # Final summary
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total processed: {count_processed}")
        logger.info(f"Total moved: {count_moved}")
        logger.info(f"Total failed: {count_failed}")
        logger.info(f"Success rate: {(count_moved / count_processed * 100) if count_processed > 0 else 0:.1f}%")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"Error during inbox organization: {e}", exc_info=True)
        raise

def main():
    account = get_account()
    if account:
        organize_inbox(account)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
