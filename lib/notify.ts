export async function notifyGoogleChat(message: string, status: 'success' | 'error' | 'info' = 'info') {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL
    if (!webhookUrl) return

    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️'
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `${emoji} [CleanMail] ${message}`,
            }),
        })
    } catch (e) {
        console.error('Failed to send Google Chat notification:', e)
    }
}
