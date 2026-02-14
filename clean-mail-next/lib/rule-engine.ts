import { Rule } from "@/types"

export function checkRule(subject: string, sender: string, senderName: string, rule: Rule): boolean {
    // Normalize everything to NFC for consistent comparison
    const normalize = (str: string) => str ? str.normalize('NFC').toUpperCase() : ""

    const subjectNorm = normalize(subject)
    const senderNorm = normalize(sender)
    const senderNameNorm = normalize(senderName)

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
