#!/usr/bin/env python3
"""
Deep search for Vietcombank emails in Inbox
"""

from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if not account.is_authenticated:
    print("Not authenticated!")
    exit(1)

mailbox = account.mailbox()
inbox = mailbox.inbox_folder()

print("Searching for Vietcombank emails in Inbox...")
print("=" * 60)

# Search in batches
found_emails = []
batch_size = 200
max_scan = 2000  # Scan first 2000 emails

for i in range(0, max_scan, batch_size):
    messages = list(inbox.get_messages(limit=batch_size, download_attachments=False))
    
    if not messages:
        print(f"\nReached end of inbox at {i} emails")
        break
    
    for msg in messages:
        subject = msg.subject.upper()
        if 'VIETCOMBANK' in subject and 'HOÀN TIỀN' in subject:
            sender = msg.sender.address if msg.sender else "Unknown"
            found_emails.append({
                'subject': msg.subject,
                'sender': sender,
                'date': msg.received.strftime('%Y-%m-%d %H:%M') if msg.received else 'Unknown'
            })
    
    print(f"Scanned {i + len(messages)} emails... Found: {len(found_emails)}")

print("\n" + "=" * 60)
print(f"TOTAL FOUND: {len(found_emails)} Vietcombank HOÀN TIỀN emails")
print("=" * 60)

if found_emails:
    print("\nSample emails (first 10):")
    for idx, email in enumerate(found_emails[:10], 1):
        print(f"\n{idx}. {email['subject']}")
        print(f"   From: {email['sender']}")
        print(f"   Date: {email['date']}")
else:
    print("\nNo matching emails found in first 2000 emails of Inbox")
    print("They might be:")
    print("- Already moved to HOANTIEN folder")
    print("- In other folders")
    print("- Have different subject/sender")
