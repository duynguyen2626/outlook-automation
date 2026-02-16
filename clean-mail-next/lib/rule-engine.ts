import { Rule } from "@/types"

export function checkRule(subject: string, sender: string, senderName: string, isRead: boolean, rule: Rule): boolean {
    // Normalize for accent-insensitive and whitespace-stable matching
    const normalize = (str: string) => {
        if (!str) return ""
        return str
            .normalize('NFKD')
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .replace(/\u00A0/g, " ")
            .replace(/\p{M}/gu, "")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase()
    }

    const subjectNorm = normalize(subject)
    const senderNorm = normalize(sender)
    const senderNameNorm = normalize(senderName)

    // Check must_be_read
    if (rule.conditions.must_be_read && !isRead) return false

    // Check Sender
    if (rule.conditions.senders && rule.conditions.senders.length > 0) {
        const matchSender = rule.conditions.senders.some(s => {
            const sNorm = normalize(s)
            return senderNorm.includes(sNorm) || senderNameNorm.includes(sNorm)
        })
        if (!matchSender) return false
    }

    // Check Keywords (ALL must match)
    if (rule.conditions.keywords && rule.conditions.keywords.length > 0) {
        for (const k of rule.conditions.keywords) {
            const kNorm = normalize(k)
            if (!subjectNorm.includes(kNorm)) {
                console.log(`[Fail Keyword] Rule: ${rule.name}, Keyword: ${kNorm}, Subject: ${subjectNorm}`)
                return false
            }
        }
    }

    // Check Exclude Keywords (NONE must match)
    if (rule.conditions.exclude_keywords && rule.conditions.exclude_keywords.length > 0) {
        for (const k of rule.conditions.exclude_keywords) {
            if (subjectNorm.includes(normalize(k))) return false
        }
    }

    return true
}
