'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { getAccessToken } from "@/lib/auth-helper"

interface MailFolder {
    id: string
    displayName: string
    childFolderCount: number
    unreadItemCount: number
}

/**
 * Lists all mail folders for the authenticated user
 */
export async function listMailFolders() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, message: "Not authenticated", folders: [] }
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return { success: false, message: "Failed to get access token", folders: [] }
        }

        const client = getGraphClient(accessToken)

        // Fetch all folders recursively
        const folders: MailFolder[] = []

        async function fetchFoldersRecursive(parentId: string, depth: number = 0) {
            try {
                const response = await client
                    .api(`/me/mailFolders/${parentId}/childFolders`)
                    .select('id,displayName,childFolderCount,unreadItemCount')
                    .top(50)
                    .get()

                const items = response.value || []
                for (const item of items) {
                    folders.push({
                        id: item.id,
                        displayName: item.displayName,
                        childFolderCount: item.childFolderCount || 0,
                        unreadItemCount: item.unreadItemCount || 0,
                    })

                    // Recursively fetch child folders (limit depth to 5 to avoid too deep nesting)
                    if (item.childFolderCount > 0 && depth < 5) {
                        await fetchFoldersRecursive(item.id, depth + 1)
                    }
                }

                // Fetch next page if available
                if (response['@odata.nextLink']) {
                    let nextLink = response['@odata.nextLink']
                    while (nextLink) {
                        const nextRes = await client.api(nextLink).get()
                        for (const item of nextRes.value || []) {
                            folders.push({
                                id: item.id,
                                displayName: item.displayName,
                                childFolderCount: item.childFolderCount || 0,
                                unreadItemCount: item.unreadItemCount || 0,
                            })
                            if (item.childFolderCount > 0 && depth < 5) {
                                await fetchFoldersRecursive(item.id, depth + 1)
                            }
                        }
                        nextLink = nextRes['@odata.nextLink']
                    }
                }
            } catch (err) {
                console.error(`Error fetching folders from ${parentId}:`, err)
            }
        }

        // Start with msgfolderroot
        await fetchFoldersRecursive('msgfolderroot')

        return {
            success: true,
            folders: folders
        }
    } catch (error: any) {
        console.error('List folders error:', error)
        return {
            success: false,
            message: error.message || 'Failed to list folders',
            folders: []
        }
    }
}
