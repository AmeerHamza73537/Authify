// Sends transactional email through Brevo's HTTP API (https://api.brevo.com).
//
// We deliberately do NOT use SMTP here. Cloud hosts such as Railway block
// outbound SMTP ports (25 / 465 / 587), which caused "Connection timeout"
// errors. The HTTP API runs over HTTPS (port 443) and is never blocked.
//
// The export keeps the same shape the controllers already use
// (`transporter.sendMail({ from, to, subject, text, html })`) so no call
// sites need to change.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const sendMail = async ({ from, to, subject, text, html }) => {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
        throw new Error('BREVO_API_KEY is not set — add it in your Railway env vars')
    }

    // Map nodemailer-style options onto the Brevo API payload.
    const payload = {
        sender: { email: from, name: 'ZARB' },
        to: [{ email: to }],
        subject,
    }
    if (html) payload.htmlContent = html
    if (text) payload.textContent = text

    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        // Surface Brevo's error body (e.g. unverified sender, invalid key).
        const errBody = await response.text()
        throw new Error(`Brevo API ${response.status}: ${errBody}`)
    }

    return response.json()
}

// Warn loudly at startup if the key is missing, so misconfiguration is obvious.
if (!process.env.BREVO_API_KEY) {
    console.error('⚠️  BREVO_API_KEY is not set — outgoing email will fail')
} else {
    console.log('Brevo HTTP email API configured')
}

const transporter = { sendMail }

export default transporter
