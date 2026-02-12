#!/usr/bin/env python3
"""
OUTLOOK INBOX ORGANIZER - Fresh Implementation
Ready for custom rule implementation
"""

from O365 import Account, FileSystemTokenBackend
import sys
import os
import json
import logging
from typing import Optional, Dict, List
import argparse

CLIENT_ID = os.environ.get('CLIENT_ID', '1e2438e2-8dd6-414a-a9be-69bc182b438b')
STATE_FILE = '.organizer_state.json'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('organizer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ====== RULES - TO BE IMPLEMENTED ======
RULES = [
    # Step 1: Gom tất cả mail từ info@vib.com.vn vào VIB folder (DONE - 12 emails)
    # {
    #     'name': 'VIB_All_Emails',
    #     'target': 'VIB',
    #     'keywords': [],
    #     'senders': ['info@vib.com.vn'],
    #     'exclude_keywords': [],
    # },
    
    # Step 2: Sub-rules để tách loại email trong VIB folder
    {
        'name': 'VIB_OnlinePlus_Cashback',
        'target': 'SAO_KE_DIEM_THUONG',
        'keywords': ['SAO KE', 'DIEM THUONG', 'ONLINE PLUS'],
        'senders': [],
    },
    {
        'name': 'VIB_OnlinePlus_Statement',
        'target': 'SAO_KE_THE_TIN_DUNG',
        'keywords': ['SAO KE', 'THE TIN DUNG', 'ONLINE PLUS'],
        'senders': [],
        'exclude_keywords': ['DIEM THUONG'],
    },
    {
        'name': 'VIB_Travel_Elite',
        'target': 'SAO_KE_TRAVEL_ELITE',
        'keywords': ['SAO KE', 'VIB TRAVEL'],
        'senders': [],
    },
    {
        'name': 'VIB_Super_Card',
        'target': 'SAO_KE_SUPER_CARD',
        'keywords': ['SAO KE', 'VIB SUPER CARD'],
        'senders': [],
    },
]

class OrganizerState:
    def __init__(self, state_file: str = STATE_FILE):
        self.state_file = state_file
        self.data = self._load()
    
    def _load(self) -> Dict:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load state file: {e}")
        
        return {
            'last_processed_id': None,
            'total_processed': 0,
            'total_moved': 0,
            'stats': {}
        }
    
    def save(self):
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def update_stats(self, folder_path: str, count: int = 1):
        if folder_path not in self.data['stats']:
            self.data['stats'][folder_path] = 0
        self.data['stats'][folder_path] += count
    
    def mark_processed(self, email_id: str, moved: bool = False):
        self.data['last_processed_id'] = email_id
        self.data['total_processed'] += 1
        if moved:
            self.data['total_moved'] += 1

def get_account() -> Optional[Account]:
    """Authenticate with O365"""
    env_token = os.environ.get('O365_TOKEN')
    if env_token:
        try:
            with open('o365_token.txt', 'w', encoding='utf-8') as f:
                f.write(env_token)
        except Exception as e:
            logger.error(f"Failed to write token: {e}")
    
    token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
    account = Account((CLIENT_ID, None), token_backend=token_backend)
    
    if not account.is_authenticated:
        logger.error("Account not authenticated!")
        return None
    
    logger.info("✅ Account authenticated")
    return account

def get_or_create_folder(inbox, path_str: str):
    """Get or create folder by path (supports nested paths like 'A/B/C')"""
    parts = path_str.split('/')
    current = inbox
    
    for part in parts:
        try:
            subs = list(current.get_folders(limit=100))
            found = next((f for f in subs if f.name.lower() == part.lower()), None)
            
            if found:
                current = found
            else:
                logger.info(f"Creating folder: {part}")
                current = current.create_child_folder(part)
        except Exception as e:
            logger.error(f"Error with folder '{part}': {e}")
            return None
    
    return current

def check_rule(message, rule: Dict) -> bool:
    """Check if message matches a rule"""
    try:
        sender = message.sender.address.lower() if message.sender else ""
        subject = message.subject.upper() if message.subject else ""
        
        # Check sender
        if rule.get('senders'):
            match_sender = any(s.lower() in sender for s in rule['senders'])
        else:
            match_sender = True
        
        # Check keywords (ALL must match)
        if rule.get('keywords'):
            match_keywords = all(k.upper() in subject for k in rule['keywords'])
        else:
            match_keywords = True
        
        # Check exclude_keywords (NONE must match)
        if rule.get('exclude_keywords'):
            match_exclude = not any(k.upper() in subject for k in rule['exclude_keywords'])
        else:
            match_exclude = True
        
        return match_sender and match_keywords and match_exclude
    except Exception as e:
        logger.error(f"Error checking rule: {e}")
        return False

def organize_batch(account, batch_size: int = 200, dry_run: bool = False, max_batches: Optional[int] = None, source_folder: str = 'Inbox') -> Dict:
    """Organize emails in batches"""
    if not RULES:
        logger.error("❌ No rules defined! Please implement rules first.")
        return {'batches': 0, 'scanned': 0, 'moved': 0}
    
    mailbox = account.mailbox()
    
    # Get source folder
    if source_folder.lower() == 'inbox':
        inbox = mailbox.inbox_folder()
    else:
        # First get Inbox, then get child folder
        inbox_parent = mailbox.inbox_folder()
        inbox = inbox_parent.get_folder(folder_name=source_folder)
        if not inbox:
            logger.error(f"❌ Folder '{source_folder}' not found in Inbox!")
            return {'batches': 0, 'scanned': 0, 'moved': 0}
    state = OrganizerState()
    
    logger.info("="*80)
    logger.info("INBOX ORGANIZER - BATCH MODE")
    logger.info("="*80)
    logger.info(f"Rules: {len(RULES)} | Batch size: {batch_size} | Dry run: {dry_run}")
    logger.info("="*80)
    
    folder_cache = {}
    batch_count = 0
    total_scanned = 0
    total_moved = 0
    
    while True:
        if max_batches and batch_count >= max_batches:
            break
        
        batch_count += 1
        logger.info(f"\nBATCH {batch_count}")
        
        try:
            messages = list(inbox.get_messages(limit=batch_size, download_attachments=False, order_by='receivedDateTime desc'))
            
            if not messages:
                logger.info("✅ No more messages in inbox!")
                break
            
            logger.info(f"Processing {len(messages)} messages...")
        except Exception as e:
            logger.error(f"Error retrieving messages: {e}")
            break
        
        batch_moved = 0
        
        for idx, msg in enumerate(messages, 1):
            total_scanned += 1
            
            if idx % 50 == 0:
                logger.info(f"  Progress: {idx}/{len(messages)} | Moved: {batch_moved}")
            
            try:
                matched = False
                for rule in RULES:
                    if check_rule(msg, rule):
                        target_path = rule['target']
                        
                        if target_path not in folder_cache:
                            folder_cache[target_path] = get_or_create_folder(inbox, target_path)
                        
                        target_folder = folder_cache[target_path]
                        
                        if target_folder:
                            if dry_run:
                                logger.info(f"  [DRY] {rule['name']}: '{msg.subject[:40]}...'")
                            else:
                                if msg.move(target_folder):
                                    batch_moved += 1
                                    state.update_stats(target_path)
                                    matched = True
                            
                            matched = True
                            break
                
                if not dry_run:
                    state.mark_processed(msg.object_id, moved=matched)
            
            except Exception as e:
                logger.error(f"Message error: {e}")
        
        total_moved += batch_moved
        logger.info(f"Batch {batch_count}: {batch_moved}/{len(messages)} moved")
        
        if not dry_run:
            state.save()
        
        if len(messages) < batch_size:
            logger.info("✅ Processed all emails!")
            break
    
    logger.info("\n" + "="*80)
    logger.info(f"SUMMARY: {total_scanned} scanned | {total_moved} moved | {batch_count} batches")
    logger.info("="*80)
    
    return {'batches': batch_count, 'scanned': total_scanned, 'moved': total_moved}

def main():
    parser = argparse.ArgumentParser(description='Inbox Organizer')
    parser.add_argument('--batch-size', type=int, default=200)
    parser.add_argument('--max-batches', type=int, default=None)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--reset-state', action='store_true')
    parser.add_argument('--folder', type=str, default='Inbox', help='Source folder to organize (default: Inbox)')
    
    args = parser.parse_args()
    
    if args.reset_state and os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)
        logger.info("State reset")
    
    account = get_account()
    if not account:
        sys.exit(1)
    
    try:
        organize_batch(account, batch_size=args.batch_size, dry_run=args.dry_run, max_batches=args.max_batches, source_folder=args.folder)
    except KeyboardInterrupt:
        logger.info("\n⚠️  Interrupted by user")
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)

if __name__ == "__main__":
    main()
