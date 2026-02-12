from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if account.is_authenticated:
    mailbox = account.mailbox()
    print("ROOT FOLDERS:")
    folders = mailbox.get_folders(limit=100)
    for f in folders:
        print(f"- {f.name}")
        if f.name.lower() == 'inbox':
            try:
                childs = list(f.get_folders(limit=100))
                print(f"  Inbox children ({len(childs)}):")
                for c in childs[:20]:
                    print(f"    - {c.name}")
            except:
                pass
