export interface Rule {
    id: string
    name: string
    description?: string
    target_folder: string
    conditions: {
        keywords?: string[]
        senders?: string[]
        exclude_keywords?: string[]
        must_be_read?: boolean
    }
    categories?: string[]
    is_active: boolean
    source_folder?: string
}

export interface ExecutionLog {
    id: string
    rule_id: string
    email_subject: string
    email_sender: string
    source_folder: string
    target_folder: string
    status: 'moved' | 'failed' | 'skipped'
    error_message?: string
    processed_at: string
}

declare module "next-auth" {
    interface Session {
        user?: {
            id?: string
            email?: string
            name?: string
            image?: string
        }
        accessToken?: string
        refreshToken?: string
        expiresAt?: number
    }
}
