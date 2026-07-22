import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("uvicorn.error")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@fintrack.local")
APP_URL = os.getenv("APP_URL", "http://localhost:8000")

def send_email(to_email: str, subject: str, html_content: str, text_fallback: str):
    # Check if SMTP is configured
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD]):
        logger.warning(
            f"\n[MOCK EMAIL SENT]\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content Summary: {text_fallback}\n"
            f"----------------------------------------"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        part1 = MIMEText(text_fallback, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(SMTP_HOST, int(SMTP_PORT))
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # Print fallback logging even if SMTP fails
        logger.warning(
            f"\n[FALLBACK EMAIL LOG]\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content Summary: {text_fallback}\n"
            f"----------------------------------------"
        )
        return False

def send_verification_email(email: str, token: str):
    verification_link = f"{APP_URL}/auth/verify-email?token={token}"
    subject = "Verify your FinTrack Account"
    text_fallback = f"Please verify your email by opening the link: {verification_link}"
    html_content = f"""
    <html>
        <body>
            <h2>Welcome to FinTrack</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="{verification_link}">{verification_link}</a>
            <p>If you did not request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(email, subject, html_content, text_fallback)

def send_password_reset_email(email: str, token: str):
    reset_link = f"{APP_URL}/auth/reset-password?token={token}"
    subject = "Reset your FinTrack Password"
    text_fallback = f"Please reset your password by opening the link: {reset_link}"
    html_content = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Please click the link below to reset your password:</p>
            <a href="{reset_link}">{reset_link}</a>
            <p>This link will expire shortly. If you did not request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(email, subject, html_content, text_fallback)
