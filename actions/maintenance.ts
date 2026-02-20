'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { getAccessToken } from "@/lib/auth-helper"
import { revalidatePath } from "next/cache"

/**
 * Moves all emails from all subfolders back to the Inbox.
 * This is used to reset the folder structure.
 */
export async function resetFoldersToInboxAction() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, message: "Not authenticated" }
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return { success: false, message: "Failed to get access token" }
        }

        const client = getGraphClient(accessToken)

        // 1. Get all folders
        const foldersRes = await client.api('/me/mailFolders').top(100).get()
        const folders = foldersRes.value || []

        let totalMoved = 0
        const log = []

        for (const folder of folders) {
            // Skip Inbox, Junk, Deleted, Sent, Outbox, Archive
            const skipFolders = ['inbox', 'junkemail', 'deleteditems', 'sentitems', 'outbox', 'archive']
            if (skipFolders.includes(folder.displayName.toLowerCase()) || skipFolders.includes(folder.id)) {
                continue
            }

            console.log(`Processing folder: ${folder.displayName} (${folder.id})`)

            // 2. Get messages in this folder
            let messagesRes = await client.api(`/me/mailFolders/${folder.id}/messages`).select('id').top(50).get()

            while (messagesRes.value && messagesRes.value.length > 0) {
                const messageIds = messagesRes.value.map((m: any) => m.id)

                // 3. Move messages to Inbox
                // We move them one by one or in batches if Graph supports it (batch move is tricky in Graph v1.0)
                // Using move endpoint: POST /me/messages/{id}/move
                for (const id of messageIds) {
                    try {
                        await client.api(`/me/messages/${id}/move`).post({ destinationId: 'inbox' })
                        totalMoved++
                    } catch (moveErr) {
                        console.error(`Failed to move message ${id}:`, moveErr)
                    }
                }

                // Get next batch if exists
                if (messagesRes['@odata.nextLink']) {
                    messagesRes = await client.api(messagesRes['@odata.nextLink']).get()
                } else {
                    break
                }
            }

            log.push(`Moved all items from ${folder.displayName}`)
        }

        revalidatePath('/dashboard')
        return {
            success: true,
            message: `Successfully moved ${totalMoved} emails to Inbox.`,
            log
        }

    } catch (error: any) {
        console.error('Reset folders error:', error)
        return { success: false, message: error.message || 'Failed to reset folders' }
    }
}
