#!/usr/bin/env python3
"""
Debug tool to check actual email details
"""

from O365 import Account, FileSystemTokenBackend
import sys

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if not account.is_authenticated:
    print("Not authenticated!")
    sys.exit(1)

mailbox = account.mailbox()
inbox = mailbox.inbox_folder()

# Get first 20 emails
messages = list(inbox.get_messages(limit=20))

print(f"\n=== SAMPLE EMAILS FROM INBOX (First 20) ===\n")

keyword = "VIETCOMBANK"
found = 0

for idx, msg in enumerate(messages, 1):
    if keyword.upper() in msg.subject.upper():
        found += 1
        sender = msg.sender.address if msg.sender else "Unknown"
        sender_name = msg.sender.name if msg.sender else "Unknown"
        
        print(f"{found}. Subject: {msg.subject}")
        print(f"   From: {sender} ({sender_name})")
        print(f"   Has 'HOÀN TIỀN': {'HOÀN TIỀN' in msg.subject.upper()}")
        print()

if found == 0:
    print(f"No emails found with keyword '{keyword}' in first 20 emails")
    print("\nShowing first 5 emails instead:")
    for idx, msg in enumerate(messages[:5], 1):
        sender = msg.sender.address if msg.sender else "Unknown"
        print(f"{idx}. {msg.subject[:60]}")
        print(f"   From: {sender}")
        print()
