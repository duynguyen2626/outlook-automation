#!/usr/bin/env python3
"""
Rule Executor Engine - Manages rule execution and email organization
"""

from O365 import Account, FileSystemTokenBackend
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class RuleExecutor:
    def __init__(self, client_id: str = None):
        self.client_id = client_id or os.environ.get('CLIENT_ID', '1e2438e2-8dd6-414a-a9be-69bc182b438b')
        self.account = None
        self.mailbox = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with O365"""
        token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
        self.account = Account((self.client_id, None), token_backend=token_backend)
        
        if self.account.is_authenticated:
            self.mailbox = self.account.mailbox()
            logger.info("✓ Authenticated with O365")
            return True
        else:
            logger.error("✗ Failed to authenticate with O365")
            return False
    
    def get_inbox(self):
        """Get inbox folder"""
        if self.mailbox:
            return self.mailbox.inbox_folder()
        return None
    
    def get_folder(self, folder_name: str, parent_folder=None):
        """Get folder by name"""
        if parent_folder:
            return parent_folder.get_folder(folder_name=folder_name)
        else:
            inbox = self.get_inbox()
            if inbox:
                return inbox.get_folder(folder_name=folder_name)
        return None
    
    def create_folder(self, folder_path: str):
        """Create folder structure (e.g., 'VIB/SAO_KE' or 'VCBANK/HOANTIEN')"""
        parts = folder_path.split('/')
        inbox = self.get_inbox()
        
        if not inbox:
            return None
        
        current = inbox
        for part in parts:
            existing = current.get_folder(folder_name=part)
            if existing:
                current = existing
            else:
                try:
                    current = current.create_child_folder(part)
                    logger.info(f"✓ Created folder: {part}")
                except Exception as e:
                    logger.error(f"✗ Failed to create folder {part}: {e}")
                    return None
        
        return current
    
    def rename_folder(self, folder_path: str, new_name: str) -> bool:
        """Rename a folder"""
        try:
            parts = folder_path.split('/')
            inbox = self.get_inbox()
            
            if not inbox:
                return False
            
            # Navigate to parent
            current = inbox
            for part in parts[:-1]:
                existing = current.get_folder(folder_name=part)
                if not existing:
                    logger.error(f"Parent folder not found: {part}")
                    return False
                current = existing
            
            # Get target folder
            target = current.get_folder(folder_name=parts[-1])
            if not target:
                logger.error(f"Folder not found: {parts[-1]}")
                return False
            
            # Rename using update method
            # O365 folders don't have .save(), use update() instead
            target.name = new_name
            try:
                # Try update method
                result = target.update()
                if result:
                    logger.info(f"✓ Renamed folder '{parts[-1]}' to '{new_name}'")
                    return True
            except AttributeError:
                # Fallback: recreate folder
                logger.warning("Update not available, rename feature not supported by API")
                return False
            
            return False
        
        except Exception as e:
            logger.error(f"Rename error: {e}")
            return False
    
    def list_folders(self, parent_path: str = '') -> List[Dict]:
        """List all folders"""
        folders = []
        try:
            if not parent_path or parent_path.lower() == 'inbox':
                current = self.get_inbox()
            else:
                inbox = self.get_inbox()
                current = inbox.get_folder(folder_name=parent_path) if inbox else None
            
            if current:
                children = list(current.get_folders(limit=100))
                for child in children:
                    try:
                        msg_count = len(list(child.get_messages(limit=1)))
                    except:
                        msg_count = 0
                    
                    folders.append({
                        'name': child.name,
                        'path': f"{parent_path}/{child.name}" if parent_path else child.name,
                        'message_count': msg_count,
                    })
        except Exception as e:
            logger.error(f"List folders error: {e}")
        
        return folders
    
    def check_rule(self, message, rule: Dict) -> bool:
        """Check if message matches rule"""
        try:
            # Check sender
            if rule.get('senders'):
                sender_email = message.sender.address if message.sender else ""
                match_sender = any(s.lower() in sender_email.lower() for s in rule['senders'])
                if not match_sender:
                    # Debug log
                    logger.debug(f"Sender not matched: {sender_email} (expected: {rule['senders']})")
                    return False
            
            # Check keywords (ALL must be in subject)
            if rule.get('keywords'):
                subject = message.subject.upper()
                for keyword in rule['keywords']:
                    if keyword.upper() not in subject:
                        # Debug log
                        logger.debug(f"Keyword '{keyword}' not found in: {message.subject[:50]}")
                        return False
            
            # Check exclude keywords (NONE can be in subject)
            if rule.get('exclude_keywords'):
                subject = message.subject.upper()
                for keyword in rule['exclude_keywords']:
                    if keyword.upper() in subject:
                        logger.debug(f"Excluded keyword '{keyword}' found in: {message.subject[:50]}")
                        return False
            
            # Log matched message
            sender_email = message.sender.address if message.sender else "Unknown"
            logger.info(f"✓ MATCH: {message.subject[:60]} | From: {sender_email}")
            return True
        except Exception as e:
            logger.error(f"Rule check error: {e}")
            return False
    
    def execute_rule(self, rule: Dict, source_folder: str = 'Inbox', dry_run: bool = False, batch_size: int = 100, max_emails: int = None) -> Dict:
        """Execute a rule on source folder with pagination"""
        result = {
            'rule_name': rule.get('name'),
            'scanned': 0,
            'moved': 0,
            'status': 'pending',
            'batches': 0
        }
        
        try:
            # Get source folder
            if source_folder.lower() == 'inbox':
                folder = self.get_inbox()
            else:
                inbox = self.get_inbox()
                folder = inbox.get_folder(folder_name=source_folder) if inbox else None
            
            if not folder:
                result['status'] = 'error'
                result['message'] = f"Source folder '{source_folder}' not found"
                return result
            
            # Create target folder
            target_path = rule.get('target')
            target_folder = self.create_folder(target_path)
            
            if not target_folder:
                result['status'] = 'error'
                result['message'] = f"Failed to create target folder: {target_path}"
                return result
            
            # Process messages in single pass - get ALL messages at once
            # O365 API returns latest messages sorted, so we continue until no more messages
            batch_num = 0
            has_more = True
            
            while has_more:
                batch_num += 1
                
                # Get next batch of messages
                # Note: After moving, inbox shrinks, so we always fetch from top
                messages = list(folder.get_messages(limit=batch_size, download_attachments=False))
                
                if not messages:
                    has_more = False
                    break
                
                result['batches'] = batch_num
                batch_moved = 0
                
                # Process each message
                for msg in messages:
                    result['scanned'] += 1
                    
                    # Stop if max_emails reached
                    if max_emails and result['scanned'] > max_emails:
                        has_more = False
                        break
                    
                    if self.check_rule(msg, rule):
                        if not dry_run:
                            try:
                                if msg.move(target_folder):
                                    result['moved'] += 1
                                    batch_moved += 1
                            except Exception as e:
                                logger.error(f"Failed to move message: {e}")
                        else:
                            result['moved'] += 1
                            batch_moved += 1
                
                logger.info(f"Batch {batch_num}: {result['scanned']} scanned, {result['moved']} moved (this batch: {batch_moved})")
                
                # Stop if max_emails reached
                if max_emails and result['scanned'] >= max_emails:
                    has_more = False
                    break
                
                # Stop if no messages moved in this batch and fewer messages than batch size
                # This means we've processed everything relevant
                if not dry_run and batch_moved == 0 and len(messages) < batch_size:
                    has_more = False
                    break
                
                # In dry_run, stop if fewer messages than batch size
                if dry_run and len(messages) < batch_size:
                    has_more = False
                    break
            
            result['status'] = 'success'
            result['message'] = f"Processed {result['scanned']} messages in {result['batches']} batches, moved {result['moved']}"
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = str(e)
            logger.error(f"Rule execution error: {e}", exc_info=True)
        
        return result
