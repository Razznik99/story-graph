import nodemailer from "nodemailer"

export const sendEmail = async ({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) => {
    const transporter = nodemailer.createTransport(process.env.MAIL_SERVER)

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html,
    })
}
