from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if account.is_authenticated:
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    
    # Get first 50 messages to check
    messages = list(inbox.get_messages(limit=50))
    
    print(f"Total fetched: {len(messages)}")
    print("\nEmails with SAO KE + VIB:\n")
    
    for m in messages:
        subj = m.subject.upper()
        if 'SAO KE' in subj and 'VIB' in subj:
            sender = m.sender.address if m.sender else 'Unknown'
            print(f"Subject: {m.subject}")
            print(f"From: {sender}")
            print(f"has DIEM THUONG: {'DIEM THUONG' in subj}")
            print()
