// This file is to send emails to users who login

import nodemailer from 'nodemailer'

// Creates a transporter object using nodemailer.createTransport(), which sets up the connection to the SMTP server (smtp-relay.brevo.com on port 587).
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    // Uses authentication credentials (user and pass) from environment variables for security.
    auth:{
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Fail fast instead of hanging if the SMTP server is unreachable / port blocked.
    connectionTimeout: 10000, // 10s to establish the TCP connection
    greetingTimeout: 10000,   // 10s to receive the SMTP greeting
    socketTimeout: 15000,     // 15s of inactivity before giving up
})

// Log SMTP readiness on startup so mail problems are visible immediately.
transporter.verify()
    .then(() => console.log('SMTP transporter ready'))
    .catch(err => console.error('SMTP transporter NOT ready:', err.message))

export default transporter