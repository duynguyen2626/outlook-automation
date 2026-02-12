from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if account.is_authenticated:
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    vib = inbox.get_folder(folder_name='VIB')
    
    if vib:
        # List VIB children
        children = list(vib.get_folders(limit=100))
        print(f"VIB folder children: {len(children)}")
        for c in children:
            msgs = list(c.get_messages(limit=100))
            print(f"\n- {c.name}: {len(msgs)} emails")
            for m in msgs[:3]:
                print(f"    • {m.subject[:60]}")
