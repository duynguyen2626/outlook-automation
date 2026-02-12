from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

def list_folder_tree(folder, indent=0):
    try:
        name = folder.name
        msgs = list(folder.get_messages(limit=100))
        count = len(msgs)
        print(f"{'  ' * indent}- {name}: {count} emails")
        
        if count > 0 and count <= 3:
            for m in msgs:
                print(f"{'  ' * (indent+1)}• {m.subject[:50]}")
        
        children = list(folder.get_folders(limit=100))
        for child in children:
            list_folder_tree(child, indent+1)
    except:
        pass

if account.is_authenticated:
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    vib = inbox.get_folder(folder_name='VIB')
    
    if vib:
        print("VIB folder tree:")
        list_folder_tree(vib)
