from O365 import Account, FileSystemTokenBackend

CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'
token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
account = Account((CLIENT_ID, None), token_backend=token_backend)

if account.is_authenticated:
    mailbox = account.mailbox()
    inbox = mailbox.inbox_folder()
    vib = inbox.get_folder(folder_name='VIB')
    
    if vib:
        # Get nested VIB folder
        nested_vib = vib.get_folder(folder_name='VIB')
        
        if nested_vib:
            print("Found nested VIB/VIB folder. Moving sub-folders up...")
            
            sub_folders = list(nested_vib.get_folders(limit=100))
            print(f"Sub-folders to move: {len(sub_folders)}")
            
            for sub in sub_folders:
                print(f"\nProcessing: {sub.name}")
                # Create corresponding folder in VIB (root)
                target = vib.create_child_folder(sub.name)
                
                if target:
                    # Move all messages from nested to target
                    messages = list(sub.get_messages(limit=1000))
                    print(f"  Moving {len(messages)} emails...")
                    
                    for msg in messages:
                        msg.move(target)
                    
                    # Delete the original subfolder
                    sub.delete()
                    print(f"  ✓ Moved and deleted nested {sub.name}")
            
            # Delete the empty nested VIB folder
            try:
                nested_vib.delete()
                print("\n✓ Deleted empty VIB/VIB folder")
            except Exception as e:
                print(f"\nCouldn't delete nested VIB: {e}")
