#!/usr/bin/env python3
"""
Clean Mail - Web UI for Email Organization
"""

from flask import Flask, render_template, jsonify, request
from rule_executor import RuleExecutor
from rules_config import RULES
import logging
from datetime import datetime

app = Flask(__name__)
executor = RuleExecutor()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    """Homepage - List all rules"""
    active_rules = [r for r in RULES if r.get('active', True)]
    pending_rules = [r for r in RULES if not r.get('active', True)]
    
    return render_template('index.html', 
                         active_rules=active_rules,
                         pending_rules=pending_rules)

@app.route('/api/rules')
def get_rules_api():
    """Get all rules as JSON"""
    return jsonify({
        'active': [r for r in RULES if r.get('active', True)],
        'pending': [r for r in RULES if not r.get('active', True)],
    })

@app.route('/api/run-rule', methods=['POST'])
def run_rule():
    """Execute a rule"""
    data = request.json
    rule_id = data.get('rule_id')
    dry_run = data.get('dry_run', True)
    batch_size = data.get('batch_size', 100)
    max_emails = data.get('max_emails')
    
    # Find rule
    rule = None
    for r in RULES:
        if r['id'] == rule_id:
            rule = r
            break
    
    if not rule:
        return jsonify({'success': False, 'message': 'Rule not found'}), 404
    
    logger.info(f"Executing rule: {rule['name']} (dry_run={dry_run}, batch_size={batch_size})")
    
    # Execute
    result = executor.execute_rule(
        rule,
        source_folder=rule.get('source_folder', 'Inbox'),
        dry_run=dry_run,
        batch_size=batch_size,
        max_emails=max_emails
    )
    
    # Update last_run
    rule['last_run'] = datetime.now().isoformat()
    
    return jsonify({
        'success': result['status'] == 'success',
        'result': result
    })

@app.route('/api/test-rule', methods=['POST'])
def test_rule():
    """Test a rule (dry-run)"""
    data = request.json
    rule_id = data.get('rule_id')
    batch_size = data.get('batch_size', 100)
    max_emails = data.get('max_emails', 500)
    
    # Find rule
    rule = None
    for r in RULES:
        if r['id'] == rule_id:
            rule = r
            break
    
    if not rule:
        return jsonify({'success': False, 'message': 'Rule not found'}), 404
    
    logger.info(f"Testing rule: {rule['name']}")
    
    # Execute with dry_run=True and limit to max_emails for faster testing
    result = executor.execute_rule(
        rule,
        source_folder=rule.get('source_folder', 'Inbox'),
        dry_run=True,
        batch_size=batch_size,
        max_emails=max_emails
    )
    
    return jsonify({
        'success': result['status'] == 'success',
        'result': result
    })

@app.route('/api/status')
def get_status():
    """Get system status"""
    return jsonify({
        'authenticated': executor.account and executor.account.is_authenticated,
        'mailbox': executor.mailbox is not None,
    })

@app.route('/api/sample-emails')
def sample_emails():
    """Get sample emails for debugging"""
    try:
        folder_name = request.args.get('folder', 'Inbox')
        limit = int(request.args.get('limit', 10))
        keyword = request.args.get('keyword', '').upper()
        
        if folder_name.lower() == 'inbox':
            folder = executor.get_inbox()
        else:
            inbox = executor.get_inbox()
            folder = inbox.get_folder(folder_name=folder_name) if inbox else None
        
        if not folder:
            return jsonify({'success': False, 'message': f"Folder '{folder_name}' not found"}), 404
        
        messages = list(folder.get_messages(limit=limit * 2))
        samples = []
        
        for msg in messages:
            if keyword and keyword not in msg.subject.upper():
                continue
            
            sender = msg.sender.address if msg.sender else "Unknown"
            samples.append({
                'subject': msg.subject,
                'sender': sender,
                'sender_name': msg.sender.name if msg.sender else "Unknown"
            })
            
            if len(samples) >= limit:
                break
        
        return jsonify({
            'success': True,
            'folder': folder_name,
            'samples': samples
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/folders')
def get_folders():
    """List all folders"""
    parent = request.args.get('parent', '')
    folders = executor.list_folders(parent)
    return jsonify({'folders': folders})

@app.route('/api/rename-folder', methods=['POST'])
def rename_folder():
    """Rename a folder"""
    data = request.json
    folder_path = data.get('path')
    new_name = data.get('new_name')
    
    if not folder_path or not new_name:
        return jsonify({'success': False, 'message': 'Missing path or new_name'}), 400
    
    logger.info(f"Renaming folder: {folder_path} → {new_name}")
    
    success = executor.rename_folder(folder_path, new_name)
    
    return jsonify({
        'success': success,
        'message': f"Folder renamed to '{new_name}'" if success else "Failed to rename folder"
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
