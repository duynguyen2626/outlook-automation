"""
Email Organization Rules
"""

RULES = [
    # Vietcombank - Hoàn tiền (Cashback)
    {
        'id': 'vcbank_hoantien',
        'name': 'Vietcombank - Hoàn Tiền',
        'description': 'Cashback/refund notifications from Vietcombank',
        'target': 'VCBANK/HOANTIEN',
        'keywords': ['THÔNG BÁO HOÀN TIỀN', 'VIETCOMBANK'],
        'senders': ['vietcombank.com.vn'],  # Match any @vietcombank.com.vn address
        'exclude_keywords': [],
        'source_folder': 'Inbox',
        'active': True,
        'last_run': None,
    },
    
    # VIB - Statements (Pending)
    # {
    #     'id': 'vib_statements',
    #     'name': 'VIB - Statements',
    #     'description': 'Bank statements from VIB',
    #     'target': 'VIB/SAO_KE',
    #     'keywords': ['SAO KE', 'VIB'],
    #     'senders': ['info@vib.com.vn'],
    #     'exclude_keywords': [],
    #     'source_folder': 'Inbox',
    #     'active': False,
    #     'last_run': None,
    # },
]

def get_rules():
    """Get all active rules"""
    return [r for r in RULES if r.get('active', True)]

def get_rule(rule_id: str):
    """Get rule by ID"""
    for rule in RULES:
        if rule['id'] == rule_id:
            return rule
    return None

def get_rule_by_name(name: str):
    """Get rule by name"""
    for rule in RULES:
        if rule['name'] == name:
            return rule
    return None
