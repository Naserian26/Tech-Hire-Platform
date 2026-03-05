import smtplib
import boto3
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from app.core.config import get_settings

settings = get_settings()


def _render_template(name: str, **kwargs) -> str:
    path = Path(__file__).parent.parent / "templates" / "emails" / name
    html = path.read_text()
    for k, v in kwargs.items():
        html = html.replace(f"{{{{{k}}}}}", str(v))
    return html


async def send_email(to: str, subject: str, html: str):
    """Send via SES if configured, otherwise fallback to SMTP."""
    if settings.AWS_ACCESS_KEY_ID:
        client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        client.send_email(
            Source=settings.SES_FROM_EMAIL,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Html": {"Data": html}},
            },
        )
    else:
        # SMTP fallback (e.g. Gmail, Mailtrap)
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SES_FROM_EMAIL
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SES_FROM_EMAIL, to, msg.as_string())


async def send_verification_email(to: str, token: str):
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = _render_template("verify_email.html", verify_link=link, email=to)
    await send_email(to, "Verify your TechHire email", html)


async def send_password_reset_email(to: str, token: str):
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = _render_template("reset_password.html", reset_link=link, email=to)
    await send_email(to, "Reset your TechHire password", html)
