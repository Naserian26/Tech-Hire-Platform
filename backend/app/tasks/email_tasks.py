import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from celery import shared_task
from jinja2 import Environment, FileSystemLoader
from app.config import get_settings

settings = get_settings()

# Setup Jinja2 (Templates)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
template_dir = os.path.join(BASE_DIR, 'app', 'templates', 'emails')
env = Environment(loader=FileSystemLoader(template_dir))

@shared_task(name="send_status_update_email")
def send_status_update_email(
    to_email: str, 
    user_name: str, 
    stage: str, 
    company_name: str, 
    job_title: str
):
    """
    Sends a REAL email using SMTP.
    """
    
    # 1. Choose Template
    if stage == "INTERVIEW":
        template_name = "status_update_interview.html"
        subject = f"Interview Invitation: {job_title}"
    elif stage == "OFFER":
        template_name = "status_update_offer.html"
        subject = f"Congratulations! Offer for {job_title}"
    elif stage == "REJECTED":
        template_name = "status_update_rejected.html"
        subject = f"Update on your application to {company_name}"
    else:
        return {"status": "error", "message": "Unknown stage"}

    print(f"📧 Preparing to send REAL email to {to_email}...")

    try:
        # 2. Render HTML
        template = env.get_template(template_name)
        html_content = template.render(
            candidate_name=user_name,
            company_name=company_name,
            job_title=job_title,
            frontend_url=settings.FRONTEND_URL
        )

        # 3. Create Email Message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg['To'] = to_email

        # Attach HTML body
        part = MIMEText(html_content, 'html')
        msg.attach(part)

        # 4. Connect to SMTP Server and Send
        # Note: port 587 is standard for TLS (Gmail, Outlook, etc.)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls() # Secure the connection
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()

        print(f"✅ SUCCESS: Email sent to {to_email}")
        return {"status": "success", "to": to_email}

    except Exception as e:
        print(f"❌ ERROR: Failed to send email. Reason: {e}")
        return {"status": "error", "message": str(e)}