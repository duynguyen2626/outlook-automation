'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { getAccessToken } from "@/lib/auth-helper"

const FOLDER_STRUCTURE = [
    "CleanMail_Organized",
    "CleanMail_Organized/Cashback",
    "CleanMail_Organized/Transactions",
    "CleanMail_Organized/Statements",
    "CleanMail_Organized/Marketing",
]

/**
 * Creates the mail folder structure for clean mail organization
 */
export async function setupMailFolders() {
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
        const created: string[] = []

        // Start with msgfolderroot as the base
        let currentParentId = 'msgfolderroot'

        for (const folderPath of FOLDER_STRUCTURE) {
            const parts = folderPath.split('/')
            
            for (const part of parts) {
                try {
                    // Check if folder exists
                    const existingRes = await client
                        .api(`/me/mailFolders/${currentParentId}/childFolders`)
                        .filter(`displayName eq '${part}'`)
                        .select('id')
                        .get()

                    if (existingRes.value?.length > 0) {
                        currentParentId = existingRes.value[0].id
                    } else {
                        // Create new folder
                        const newFolder = await client
                            .api(`/me/mailFolders/${currentParentId}/childFolders`)
                            .post({ displayName: part })
                        currentParentId = newFolder.id
                        created.push(folderPath)
                    }
                } catch (err) {
                    console.error(`Error processing folder ${part}:`, err)
                }
            }

            // Reset parent for next top-level folder
            currentParentId = 'msgfolderroot'
        }

        return {
            success: true,
            message: `Created ${created.length} folders`,
            created: created
        }
    } catch (error: any) {
        console.error('Setup folders error:', error)
        return {
            success: false,
            message: error.message || 'Failed to setup folders'
        }
    }
}
