#!/usr/bin/env python3
"""
Search ALL folders for Vietcombank emails using query
"""

from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if not account.is_authenticated:
    print("Not authenticated!")
    exit(1)

mailbox = account.mailbox()

print("Searching ALL FOLDERS for Vietcombank HOÀN TIỀN emails...")
print("=" * 60)

# Use query to search
try:
    # Search with subject contains
    query = mailbox.new_query().on_attribute('subject').contains('VIETCOMBANK')
    query.chain('and').on_attribute('subject').contains('HOÀN TIỀN')
    
    messages = mailbox.get_messages(query=query, limit=100)
    
    found = []
    for msg in messages:
        sender = msg.sender.address if msg.sender else "Unknown"
        folder_name = getattr(msg.folder, 'name', 'Unknown')
        found.append({
            'subject': msg.subject,
            'sender': sender,
            'folder': folder_name,
            'date': msg.received.strftime('%Y-%m-%d') if msg.received else 'Unknown'
        })
    
    print(f"\nFOUND: {len(found)} emails\n")
    
    if found:
        # Group by folder
        by_folder = {}
        for email in found:
            folder = email['folder']
            if folder not in by_folder:
                by_folder[folder] = []
            by_folder[folder].append(email)
        
        print("Emails by folder:")
        for folder, emails in by_folder.items():
            print(f"\n📁 {folder}: {len(emails)} emails")
            for idx, e in enumerate(emails[:3], 1):
                print(f"   {idx}. {e['subject'][:50]}")
                print(f"      From: {e['sender']} | Date: {e['date']}")
    else:
        print("No emails found with query")
        print("\nTrying broader search with just 'VIETCOMBANK'...")
        
        query2 = mailbox.new_query().on_attribute('subject').contains('VIETCOMBANK')
        messages2 = list(mailbox.get_messages(query=query2, limit=20))
        
        print(f"Found {len(messages2)} emails with 'VIETCOMBANK'")
        for idx, msg in enumerate(messages2[:5], 1):
            sender = msg.sender.address if msg.sender else "Unknown"
            print(f"\n{idx}. {msg.subject}")
            print(f"   From: {sender}")

except Exception as e:
    print(f"Query failed: {e}")
    print("\nFalling back to manual search in Inbox...")
    
    inbox = mailbox.inbox_folder()
    messages = list(inbox.get_messages(limit=500))
    
    found = []
    for msg in messages:
        if 'VIETCOMBANK' in msg.subject.upper():
            sender = msg.sender.address if msg.sender else "Unknown"
            found.append({
                'subject': msg.subject,
                'sender': sender
            })
    
    print(f"Found {len(found)} Vietcombank emails in first 500 of Inbox")
    for idx, e in enumerate(found[:10], 1):
        print(f"{idx}. {e['subject']}")
        print(f"   From: {e['sender']}")
