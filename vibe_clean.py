from O365 import Account, FileSystemTokenBackend
import sys
import os

# CONFIG
CLIENT_ID = '1e2438e2-8dd6-414a-a9be-69bc182b438b'

# RULES
RULES = [
    {
        'name': 'OnlinePlus_Statement',
        'target': '02_Statements/VIB/OnlinePlus',
        'keywords': ['SAO KE THE TIN DUNG VIB ONLINE PLUS'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'name': 'SuperCard_Statement',
        'target': '02_Statements/VIB/SuperCard',
        'keywords': ['SAO KE THE TIN DUNG VIB SUPER CARD', 'SAO KE DIEM THUONG'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'name': 'TravelElite_Statement',
        'target': '02_Statements/VIB/TravelElite',
        'keywords': ['TRAVEL ELITE', 'TRAVEL ÉLITE', 'THE TIN DUNG VIB TRAVEL'],
        'senders': ['info@card.vib.com.vn']
    },
    {
        'name': 'VIB_Transactions',
        'target': '01_Banking_OTP/VIB',
        'keywords': ['GIAO DICH', 'THAY DOI THIET BI', 'THONG BAO DU NO', 'DU NO THE TIN DUNG'],
        'senders': ['@vib.com.vn']
    }
]

def get_account():
    token_backend = FileSystemTokenBackend(token_path='.', token_filename='o365_token.txt')
    account = Account((CLIENT_ID, None), token_backend=token_backend)
    return account if account.is_authenticated else None

def get_or_create_folder(inbox, path_str):
    parts = path_str.split('/')
    curr = inbox
    for p in parts:
        try:
            subs = list(curr.get_folders(limit=100))
            found = next((f for f in subs if f.name.lower() == p.lower()), None)
            if found:
                curr = found
            else:
                curr = curr.create_child_folder(p)
        except:
            return None
    return curr

def run_organizer_batch(start_idx=0, batch_size=500):
    account = get_account()
    if not account: return print("Lỗi xác thực!")
    
    inbox = account.mailbox().inbox_folder()
    
    print(f"\n--- ĐANG QUÉT CỤM: Mail thứ {start_idx + 1} đến {start_idx + batch_size} ---")
    
    # Lấy generator (không giới hạn để ta tự skip bằng code)
    messages = inbox.get_messages(limit=start_idx + batch_size, download_attachments=False)
    
    folder_cache = {}
    current_idx = 0
    scanned_in_batch = 0
    moved_count = 0
    
    for msg in messages:
        current_idx += 1
        
        # Bỏ qua các mail trước start_idx
        if current_idx <= start_idx:
            continue
            
        scanned_in_batch += 1
        print(f"\rĐang kiểm tra: {current_idx}...", end="", flush=True)

        subject = msg.subject.upper() if msg.subject else ""
        sender = msg.sender.address.lower() if msg.sender else ""
        
        for rule in RULES:
            match_sender = any(s.lower() in sender for s in rule['senders'])
            match_key = any(k.upper() in subject for k in rule['keywords'])
            
            if match_sender and match_key:
                path = rule['target']
                if path not in folder_cache:
                    folder_cache[path] = get_or_create_folder(inbox, path)
                
                target_f = folder_cache[path]
                if target_f:
                    try:
                        if msg.move(target_f):
                            moved_count += 1
                            print(f"\n[{moved_count}] OK -> {path}: {msg.subject[:40]}...")
                            break
                    except: break
        
        # Nếu đã quét đủ batch_size thì dừng lại
        if scanned_in_batch >= batch_size:
            break

    print(f"\nBatch xong! Đã quét: {scanned_in_batch} | Đã dọn: {moved_count}")
    return scanned_in_batch

def main():
    current_start = 0
    batch_size = 500
    
    while True:
        scanned = run_organizer_batch(start_idx=current_start, batch_size=batch_size)
        
        if scanned == 0:
            print("\nĐã quét hết toàn bộ Inbox!")
            break
            
        cont = input(f"\nĐã xử lý xong {scanned} mail tiếp theo. Bạn muốn quét tiếp {batch_size} mail không? (y/n): ")
        if cont.lower() == 'y':
            current_start += scanned
        else:
            print("Tạm dừng. Hẹn gặp lại!")
            break

if __name__ == "__main__":
    main()
