import nodemailer from "nodemailer";

const sendEmail = async ({ email, subject, message }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
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
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error(error.message);
    }
};

export { sendEmail };
