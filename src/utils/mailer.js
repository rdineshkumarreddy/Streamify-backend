import nodemailer from "nodemailer";

const sendEmail = async ({ email, subject, message }) => {
    try {
        if (process.env.RESEND_API_KEY) {
            console.log("Sending email via Resend API...");
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
                    to: email,
                    subject: subject,
                    html: message,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Resend API error: ${errorText}`);
            }

            const data = await response.json();
            return data;
        } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log("Sending email via SMTP...");
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT == 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: subject,
                html: message,
            };

            const mailResponse = await transporter.sendMail(mailOptions);
            return mailResponse;
        } else {
            console.warn("No email service configured (Resend or SMTP). Skipping email send.");
            return null;
        }
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error(error.message);
    }
};

export { sendEmail };
