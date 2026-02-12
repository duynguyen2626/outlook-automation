#!/usr/bin/env python3
"""
FULL RESET: Move all emails back to Inbox and delete organized folders
"""

from O365 import Account, FileSystemTokenBackend
import os

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

def reset_all():
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    print("="*80)
    print("FULL RESET: Moving all emails back to Inbox & cleaning up folders")
    print("="*80)
    
    folders_to_clear = ['01_Banking_OTP', '02_Statements', '03_Notifications', '03_Apps_Notifications']
    total_moved = 0
    
    for folder_name in folders_to_clear:
        print(f"\nProcessing: {folder_name}")
        
        try:
            # Get folder
            all_folders = list(inbox.get_folders(limit=100))
            target_folder = next((f for f in all_folders if f.name == folder_name), None)
            
            if not target_folder:
                print(f"  ℹ️ Folder '{folder_name}' not found, skipping")
                continue
            
            # Move all emails from this folder (recursively)
            moved = move_folder_contents_recursive(target_folder, inbox)
            total_moved += moved
            print(f"  ✅ Moved {moved} emails from '{folder_name}' and subfolders")
            
            # Delete the empty folder
            try:
                target_folder.delete()
                print(f"  ✅ Deleted folder '{folder_name}'")
            except Exception as e:
                print(f"  ⚠️  Could not delete folder: {e}")
        
        except Exception as e:
            print(f"  ❌ Error processing '{folder_name}': {e}")
    
    print("\n" + "="*80)
    print(f"RESET COMPLETE: {total_moved} emails moved back to Inbox")
    print("="*80)
    print("\n✨ Inbox is now clean, ready for fresh implementation!")

def move_folder_contents_recursive(folder, inbox_target):
    """Recursively move all emails from folder and subfolders to inbox"""
    total = 0
    
    # Move emails in this folder
    try:
        messages = list(folder.get_messages(limit=2000))
        for idx, msg in enumerate(messages, 1):
            try:
                msg.move(inbox_target)
                if idx % 100 == 0:
                    print(f"    Moved {idx}/{len(messages)}...")
                total += 1
            except Exception as e:
                print(f"    Error moving message: {e}")
    except Exception as e:
        print(f"    Error getting messages: {e}")
    
    # Recursively move emails from subfolders
    try:
        subfolders = list(folder.get_folders(limit=100))
        for subfolder in subfolders:
            subtotal = move_folder_contents_recursive(subfolder, inbox_target)
            total += subtotal
            
            # Try to delete empty subfolder
            try:
                subfolder.delete()
            except:
                pass
    except:
        pass
    
    return total

if __name__ == "__main__":
    reset_all()
