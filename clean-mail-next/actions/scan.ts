'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { checkRule } from "@/lib/rule-engine"
import { supabase } from "@/lib/supabase"
import { Rule } from "@/types"

export async function scanBatch(folderId: string, nextLink?: string, filterYear: number = 2025) {
    const session = await auth()
    if (!session?.accessToken) {
        return { success: false, message: "Not authenticated" }
    }

    const client = getGraphClient(session.accessToken as string)

    // 1. Fetch Active Rules
    const { data: rules } = await supabase
        .from('clean_mail_rules')
        .select('*')
        .eq('is_active', true)

    console.log("Active Rules:", JSON.stringify(rules, null, 2))

    if (!rules || rules.length === 0) {
        return { success: false, message: "No active rules" }
    }

    try {
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

            request = client.api(`/me/mailFolders/${folderId}/messages`)
                .top(50) // Smaller batch for UI responsiveness
                .select('id,subject,sender,receivedDateTime,isRead')
                .orderby('receivedDateTime desc')
            // .filter(filter) // Let's filter client side to control flow
        }

        const response = await request.get()
        const messages = response.value || []
        const newNextLink = response['@odata.nextLink']

        const matches: any[] = []
        let stopScanning = false

        // 3. Process Batch
        for (const msg of messages) {
            // Check Date
            const msgDate = new Date(msg.receivedDateTime)
            if (msgDate.getFullYear() < filterYear) {
                stopScanning = true
                break // Stop entirely if we hit older emails (assuming sorted desc)
            }

            const subject = msg.subject || ""
            const sender = msg.sender?.emailAddress?.address || ""
            const senderName = msg.sender?.emailAddress?.name || ""

            // Check Rules
            for (const rule of rules as Rule[]) {
                if (checkRule(subject, sender, senderName, rule)) {
                    matches.push({
                        id: msg.id,
                        subject: subject,
                        sender: sender,
                        senderName: senderName,
                        receivedDateTime: msg.receivedDateTime,
                        matchedRule: rule.name,
                        targetFolder: rule.target_folder,
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
            stop: stopScanning
        }

    } catch (error: any) {
        console.error("Scan Error:", error)
        return { success: false, message: error.message }
    }
}

export async function moveBatch(emailIds: string[], targetFolder: string) {
    // Simply move list of IDs to target
    // We need to resolve target folder ID first.
    // ... Implement `ensureFolder` here or reuse ...
    const session = await auth()
    if (!session?.accessToken) return { success: false, message: "Auth error" }

    const client = getGraphClient(session.accessToken as string)

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
        for (const id of emailIds) {
            try {
                await client.api(`/me/messages/${id}/move`).post({ destinationId: currentParentId })
                successCount++

                // Log to Supabase?
                // Skip for speed in UI feedback, or fire-and-forget
            } catch (e) {
                errors++
            }
        }

        return { success: true, moved: successCount, failed: errors }

    } catch (e: any) {
        return { success: false, message: e.message }
    }
}
