'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { checkRule } from "@/lib/rule-engine"
import { supabase } from "@/lib/supabase"
import { Rule } from "@/types"
import { revalidatePath } from "next/cache"
import { Client } from "@microsoft/microsoft-graph-client"

// Helper to ensure folder exists by path (e.g., "VCBANK/HOANTIEN")
async function ensureFolder(client: Client, path: string): Promise<string> {
    const parts = path.split('/')
    let currentParentId = 'msgfolderroot' // Root of folders

    for (const part of parts) {
        // 1. List children of current parent to find match
        const response = await client.api(`/me/mailFolders/${currentParentId}/childFolders`)
            .filter(`displayName eq '${part}'`)
            .select('id')
            .get()

        if (response.value && response.value.length > 0) {
            // Found
            currentParentId = response.value[0].id
        } else {
            // Create
            const newFolder = await client.api(`/me/mailFolders/${currentParentId}/childFolders`)
                .post({ displayName: part })
            currentParentId = newFolder.id
        }
    }
    return currentParentId
}

export async function organizeEmails(sourceFolderId: string = 'inbox', batchSize: number = 100, nextLink?: string) {
    const session = await auth()
    if (!session?.accessToken) {
        return { success: false, message: "Not authenticated" }
    }

    const client = getGraphClient(session.accessToken as string)

    // 1. Fetch Active Rules
    const { data: rules, error } = await supabase
        .from('clean_mail_rules')
        .select('*')
        .eq('is_active', true)

    if (error || !rules) {
        console.error("Failed to fetch rules:", error)
        return { success: false, message: "Failed to fetch rules" }
    }

    try {
        // 2. Fetch Emails
        let response
        if (nextLink) {
            response = await client.api(nextLink).get()
        } else {
            response = await client.api(`/me/mailFolders/${sourceFolderId}/messages`)
                .top(batchSize)
                .select('id,subject,sender,receivedDateTime,isRead')
                .orderby('receivedDateTime desc')
                .get()
        }

        const messages = response.value
        const newNextLink = response['@odata.nextLink']

        let movedCount = 0
        let scannedCount = messages.length
        const logs = []

        // Cache for folder IDs to avoid API spam
        const folderCache: Record<string, string> = {}

        // 3. Process Emails
        for (const msg of messages) {
            const subject = msg.subject || ""
            const sender = msg.sender?.emailAddress?.address || ""
            const senderName = msg.sender?.emailAddress?.name || ""

            for (const rule of rules as Rule[]) {
                const isRead = msg.isRead ?? false
                if (checkRule(subject, sender, senderName, isRead, rule)) {
                    console.log(`MATCH! Rule: ${rule.name}, Subject: ${subject}`);

                    try {
                        // Resolve Target Folder ID
                        let targetId = folderCache[rule.target_folder]
                        if (!targetId) {
                            targetId = await ensureFolder(client, rule.target_folder)
                            folderCache[rule.target_folder] = targetId
                        }

                        // Execute Move
                        await client.api(`/me/messages/${msg.id}/move`).post({ destinationId: targetId })

                        movedCount++
                        logs.push({
                            rule_id: rule.id,
                            email_subject: subject,
                            email_sender: sender,
                            source_folder: sourceFolderId,
                            target_folder: rule.target_folder,
                            status: 'moved',
                            processed_at: new Date().toISOString()
                        })
                        break; // Stop after first match
                    } catch (err: any) {
                        console.error("Move failed", err)
                        logs.push({
                            rule_id: rule.id,
                            email_subject: subject,
                            email_sender: sender,
                            source_folder: sourceFolderId,
                            target_folder: rule.target_folder,
                            status: 'failed',
                            error_message: err.message,
                            processed_at: new Date().toISOString()
                        })
                    }
                }
            }
        }

        // 4. Batch Insert Logs
        if (logs.length > 0) {
            await supabase.from('clean_mail_logs').insert(logs)
        }

        revalidatePath('/dashboard')
        return {
            success: true,
            scanned: scannedCount,
            moved: movedCount,
            nextLink: newNextLink, // Return link for next page
            message: `Scanned ${scannedCount}, Moved ${movedCount}`
        }

    } catch (error: any) {
        console.error("Graph API Error:", error)
        return { success: false, message: error.message }
    }
}
