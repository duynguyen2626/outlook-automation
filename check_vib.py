from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if account.is_authenticated:
    mailbox = account.mailbox()
    vib_folder = mailbox.get_folder(folder_name='VIB')
    
    if vib_folder:
        messages = list(vib_folder.get_messages(limit=50))
        print(f'VIB folder: {len(messages)} emails\n')
        print('Email types:')
        
        types = {}
        for m in messages:
            subj = m.subject.upper()
            if 'DIEM THUONG' in subj:
                key = 'DIEM THUONG'
            elif 'ONLINE PLUS' in subj:
                key = 'ONLINE PLUS'
            elif 'TRAVEL' in subj:
                key = 'TRAVEL ELITE'
            elif 'SUPER CARD' in subj:
                key = 'SUPER CARD'
            else:
                key = 'OTHER'
            
            if key not in types:
                types[key] = []
            types[key].append(m.subject[:60])
        
        for key in sorted(types.keys()):
            print(f'\n{key}: {len(types[key])}')
            for subj in types[key][:2]:
                print(f'  - {subj}')
