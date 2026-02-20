'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { checkRule } from "@/lib/rule-engine"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getAccessToken } from "@/lib/auth-helper"
import { notifyGoogleChat } from "@/lib/notify"
import { Rule } from "@/types"

export async function getRules() {
    try {
        const { data: rules, error } = await supabaseAdmin
            .from('clean_mail_rules')
            .select('id, name, description, is_active')
            .order('name', { ascending: true })

        if (error) {
            return { success: false, message: error.message, rules: [] }
        }

        return { success: true, rules: rules || [] }
    } catch (error: any) {
        return { success: false, message: error.message, rules: [] }
    }
}

export async function scanBatch(folderId: string, nextLink?: string, fromYear: number = 2025, selectedRuleIds?: string[]) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" }
    }

    const accessToken = await getAccessToken(session.user.id)
    if (!accessToken) {
        return { success: false, message: "Failed to get access token" }
    }

    const client = getGraphClient(accessToken)

    // 1. Fetch Rules (filtered if selectedRuleIds provided)
    let rulesQuery = supabaseAdmin
        .from('clean_mail_rules')
        .select('*')
        .eq('is_active', true)

    // If specific rules selected, filter to those
    if (selectedRuleIds && selectedRuleIds.length > 0) {
        rulesQuery = supabaseAdmin
            .from('clean_mail_rules')
            .select('*')
            .in('id', selectedRuleIds)
    }

    const { data: rules } = await rulesQuery

    console.log("Active Rules:", JSON.stringify(rules, null, 2))

    if (!rules || rules.length === 0) {
        return { success: false, message: "No rules selected or active" }
    }

    try {
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

        // 2. Fetch Emails 
        // We use select to keep payload small
        let request
        if (nextLink) {
            request = client.api(nextLink)
        } else {
            // Calculate start of year filter? No, standard OData filter is better if supported.
            // But let's fetch batch and filter in code to be safe with timezone.
            // Or use $filter=receivedDateTime ge 2025-01-01...
            // Graph API supports receivedDateTime ge ...

            // Build filter string
            // const startDate = `${filterYear}-01-01T00:00:00Z`
            // const filter = `receivedDateTime ge ${startDate}`

            const endpoint = folderId === "all" ? "/me/messages" : `/me/mailFolders/${folderId}/messages`
            request = client.api(endpoint)
                .top(50) // Smaller batch for UI responsiveness
                .select('id,subject,sender,receivedDateTime,isRead,parentFolderId,categories')
                .orderby('receivedDateTime desc')
            // .filter(filter) // Let's filter client side to control flow
        }

        const response = await request.get()
        const messages = response.value || []
        const newNextLink = response['@odata.nextLink']

        const matches: any[] = []
        let stopScanning = false
        let batchLastDate: string | undefined

        // 3. Process Batch
        for (const msg of messages) {
            // Check Date
            const msgDate = new Date(msg.receivedDateTime)
            if (fromYear > 0 && msgDate.getFullYear() < fromYear) {
                stopScanning = true
                break // Stop entirely if we hit older emails (assuming sorted desc)
            }
            batchLastDate = msg.receivedDateTime

            const subject = msg.subject || ""
            const sender = msg.sender?.emailAddress?.address || ""
            const senderName = msg.sender?.emailAddress?.name || ""
            const isRead = msg.isRead ?? false

            // Check Rules
            for (const rule of rules as Rule[]) {
                if (checkRule(subject, sender, senderName, isRead, rule)) {
                    // Safety: ensure keywords really exist in subject (avoid false positives)
                    const rawKeywords = (rule.conditions as any)?.keywords
                    const keywords = Array.isArray(rawKeywords)
                        ? rawKeywords
                        : (rawKeywords ? [rawKeywords] : [])

                    if (keywords.length > 0) {
                        const subjectNorm = normalize(subject)
                        const allMatch = keywords.every((k) => subjectNorm.includes(normalize(String(k))))
                        if (!allMatch) {
                            console.log(`[Skip Match] Keyword not found in subject: ${subject}`)
                            continue
                        }
                    }

                    matches.push({
                        id: msg.id,
                        subject: subject,
                        sender: sender,
                        senderName: senderName,
                        receivedDateTime: msg.receivedDateTime,
                        parentFolderId: msg.parentFolderId,
                        matchedRule: rule.name,
                        targetFolder: rule.target_folder,
                        ruleCategories: rule.categories || [],
                        messageCategories: msg.categories || [],
                        ruleId: rule.id
                    })
                    break // Stop checking rules for this email
                } else {
                    // Debug logging for specific sender (VCB)
                    if (sender.includes('vietcombank') || senderName.includes('VCB')) {
                        console.log(`[No Match] Subject: ${subject}, Rule: ${rule.name}`)
                    }
                }
            }
        }

        return {
            success: true,
            matches: matches,
            nextLink: stopScanning ? undefined : newNextLink,
            stop: stopScanning,
            scanned: messages.length,
            batchLastDate
        }

    } catch (error: any) {
        console.error("Scan Error:", error)
        return { success: false, message: error.message }
    }
}

export async function moveBatch(
    items: { id: string; parentFolderId?: string; categories?: string[] }[],
    targetFolder: string,
    categoriesOverride?: string[],
    options?: { applyTagsOnly?: boolean; replaceTags?: boolean; removeMode?: boolean }
) {
    // Move list of IDs to target and optionally apply categories (tags)
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Not authenticated" }

    const accessToken = await getAccessToken(session.user.id)
    if (!accessToken) return { success: false, message: "Failed to get access token" }

    const client = getGraphClient(accessToken)

    try {
        // Resolve Target
        // Reuse logic from organize.ts (duplicate for now to keep file clean)
        // Or better: Assume client passes valid ID? No, client passes path 'VCBANK/HOANTIEN'

        // Helper ensureFolder (quick inline)
        const parts = targetFolder.split('/')
        let currentParentId = 'msgfolderroot'
        for (const part of parts) {
            const res = await client.api(`/me/mailFolders/${currentParentId}/childFolders`)
                .filter(`displayName eq '${part}'`)
                .select('id')
                .get()
            if (res.value?.length > 0) currentParentId = res.value[0].id
            else {
                const newF = await client.api(`/me/mailFolders/${currentParentId}/childFolders`).post({ displayName: part })
                currentParentId = newF.id
            }
        }

        // Execute Batch Move
        // Graph API Batch is complex. Simple loop for MVP (Promise.all)
        // Rate limit warning: 4 parallel moves max usually safe.
        // Or sequential.
        let successCount = 0
        let errors = 0

        // Sequential to be safe
        for (const item of items) {
            const id = item.id
            const sourceFolderId = item.parentFolderId
            const itemCategories = (categoriesOverride && categoriesOverride.length > 0)
                ? categoriesOverride
                : (item.categories || [])
            try {
                console.log(`[Move] ID: ${id}, Source: ${sourceFolderId || 'unknown'}, Folder: ${currentParentId}, Categories: ${JSON.stringify(itemCategories)}`)

                if (!options?.applyTagsOnly) {
                    const movePath = sourceFolderId
                        ? `/me/mailFolders/${sourceFolderId}/messages/${id}/move`
                        : `/me/messages/${id}/move`

                    try {
                        await client.api(movePath).post({ destinationId: currentParentId })
                    } catch (err) {
                        // Fallback to generic move if folder-scoped path fails
                        if (sourceFolderId) {
                            await client.api(`/me/messages/${id}/move`).post({ destinationId: currentParentId })
                        } else {
                            throw err
                        }
                    }
                }
                
                // Apply categories (tags) based on mode
                if (options?.removeMode && categoriesOverride && categoriesOverride.length > 0) {
                    // Remove mode: fetch current categories, remove specified ones
                    try {
                        const currentEmail = await client.api(`/me/messages/${id}`).select('categories').get()
                        const currentCategories = currentEmail.categories || []
                        const updatedCategories = currentCategories.filter((cat: string) => !categoriesOverride.includes(cat))
                        await client.api(`/me/messages/${id}`).patch({ categories: updatedCategories })
                        console.log(`[Tags Removed] ID: ${id}, Removed: ${categoriesOverride.join(", ")}, Remaining: ${updatedCategories.join(", ")}`)
                    } catch (e) {
                        console.error(`[Remove Tags Error] ID: ${id}:`, e)
                    }
                } else if (options?.replaceTags) {
                    // Replace mode: clear all and apply new
                    await client.api(`/me/messages/${id}`).patch({ categories: itemCategories || [] })
                    console.log(`[Tags Replaced] ID: ${id}, Categories: ${itemCategories.join(", ")}`)
                } else if (itemCategories && itemCategories.length > 0) {
                    // Add mode: fetch current and merge
                    try {
                        const currentEmail = await client.api(`/me/messages/${id}`).select('categories').get()
                        const currentCategories = currentEmail.categories || []
                        const mergedCategories = [...new Set([...currentCategories, ...itemCategories])]
                        await client.api(`/me/messages/${id}`).patch({ categories: mergedCategories })
                        console.log(`[Tags Added] ID: ${id}, Added: ${itemCategories.join(", ")}, Total: ${mergedCategories.join(", ")}`)
                    } catch (e) {
                        console.error(`[Add Tags Error] ID: ${id}:`, e)
                    }
                }
                
                successCount++

                // Log to Supabase?
                // Skip for speed in UI feedback, or fire-and-forget
            } catch (e) {
                console.error(`[Move Error] ID: ${id}:`, e)
                errors++
            }
        }

        // Log to Supabase execution_logs
        const logPromises = items.map(async (item) => {
            await supabaseAdmin.from('execution_logs').insert({
                email_subject: 'Moved via Bulk Organizer',
                email_sender: 'bulk_action',
                source_folder: item.parentFolderId || 'multi',
                target_folder: targetFolder,
                status: 'moved',
            })
        })
        await Promise.allSettled(logPromises).catch(console.error)

        // Notify if there were errors
        if (errors > 0) {
            await notifyGoogleChat(
                `❌ MoveBatch: ${successCount} succeeded, ${errors} failed moving to ${targetFolder}`,
                'error'
            )
        }

        return { success: true, moved: successCount, failed: errors }

    } catch (e: any) {
        console.error('MoveBatch fatal error:', e)
        await notifyGoogleChat(`❌ MoveBatch fatal error: ${e.message}`, 'error')
        return { success: false, message: e.message }
    }
}

export async function moveFromTestFolder(fromYear: number = 0) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Not authenticated" }

    const accessToken = await getAccessToken(session.user.id)
    if (!accessToken) return { success: false, message: "Failed to get access token" }

    const client = getGraphClient(accessToken)

    try {
        const testFolderName = "CleanMail_Test"
        const res = await client.api(`/me/mailFolders/msgfolderroot/childFolders`)
            .filter(`displayName eq '${testFolderName}'`)
            .select('id')
            .get()

        if (!res.value || res.value.length === 0) {
            return { success: false, message: `Folder not found: ${testFolderName}` }
        }

        const testFolderId = res.value[0].id
        let nextLink: string | undefined = undefined
        let totalMoved = 0
        let totalFailed = 0
        let totalMatched = 0

        while (true) {
            const scanRes: any = await scanBatch(testFolderId, nextLink, fromYear)
            if (!scanRes.success) return scanRes

            const matches = scanRes.matches || []
            totalMatched += matches.length

            if (matches.length > 0) {
                const folderGroups: Record<string, { id: string; parentFolderId?: string; categories?: string[] }[]> = {}
                for (const match of matches) {
                    const folder = match.targetFolder
                    if (!folderGroups[folder]) folderGroups[folder] = []
                    folderGroups[folder].push({
                        id: match.id,
                        parentFolderId: match.parentFolderId,
                        categories: match.categories,
                    })
                }

                for (const [folder, items] of Object.entries(folderGroups)) {
                    const moveRes = await moveBatch(items, folder)
                    if (moveRes.success) {
                        totalMoved += moveRes.moved || 0
                        totalFailed += moveRes.failed || 0
                    } else {
                        totalFailed += items.length
                    }
                }
            }

            if (scanRes.stop || !scanRes.nextLink) break
            nextLink = scanRes.nextLink
        }

        return { success: true, matched: totalMatched, moved: totalMoved, failed: totalFailed }
    } catch (e: any) {
        return { success: false, message: e.message }
    }
}

export async function runRuleNow(ruleId: string, fromYear: number = 2025) {
    /**
     * Run a specific rule immediately: scan inbox, match emails, and move them
     * This is like "scan + move" in one action for a single rule
     */
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Not authenticated" }
    }

    const accessToken = await getAccessToken(session.user.id)
    if (!accessToken) {
        return { success: false, message: "Failed to get access token" }
    }

    const client = getGraphClient(accessToken)

    // 1. Fetch the rule
    const { data: rule, error: ruleError } = await supabaseAdmin
        .from('clean_mail_rules')
        .select('*')
        .eq('id', ruleId)
        .single()

    if (ruleError || !rule) {
        return { success: false, message: "Rule not found" }
    }

    if (!rule.is_active) {
        return { success: false, message: "Rule is not active" }
    }

    try {
        // 2. Scan inbox with this single rule
        let nextLink: string | undefined = undefined
        let totalMatched = 0
        let totalMoved = 0
        let totalFailed = 0
        const allMatches: any[] = []

        while (true) {
            // Scan inbox
            const scanRes: any = await scanBatch('inbox', nextLink, fromYear, [ruleId])
            if (!scanRes.success) {
                break // Stop on error but return partial results
            }

            const matches = scanRes.matches || []
            totalMatched += matches.length
            allMatches.push(...matches)

            // Auto-move immediately
            if (matches.length > 0) {
                const targetFolder = rule.target_folder
                const items = matches.map((m: any) => ({
                    id: m.id,
                    parentFolderId: m.parentFolderId,
                    categories: m.ruleCategories
                }))

                const moveRes = await moveBatch(items, targetFolder, rule.categories)
                if (moveRes.success) {
                    totalMoved += moveRes.moved || 0
                    totalFailed += moveRes.failed || 0
                } else {
                    totalFailed += items.length
                }
            }

            // Check if we should continue
            if (scanRes.stop || !scanRes.nextLink) break
            nextLink = scanRes.nextLink

            // Safety: limit to 10 pages (500 emails) per rule run
            if (totalMatched >= 500) break
        }

        // 3. Log execution
        try {
            await notifyGoogleChat(`✅ Rule "${rule.name}" executed: ${totalMoved} moved, ${totalFailed} failed`)
        } catch (e) {
            console.error("Failed to notify:", e)
        }

        return {
            success: true,
            matched: totalMatched,
            moved: totalMoved,
            failed: totalFailed,
            ruleName: rule.name
        }
    } catch (e: any) {
        return { success: false, message: e.message }
    }
}
