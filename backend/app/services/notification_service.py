from app.core.websocket_manager import manager
from app.tasks.email_tasks import send_status_update_email

class NotificationService:
    def __init__(self, db):
        self.db = db

    async def create_notification(self, user_id: str, type: str, title: str, body: str, action_url: str = None):
        notif = {
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "is_read": False,
            "action_url": action_url
        }
        await self.db.notifications.insert_one(notif)
        
        # Real-time push
        await manager.send_personal_message({
            "type": "new_notification",
            "data": notif
        }, user_id)

        # Trigger Email for important updates
        if type in ["INTERVIEW", "OFFER", "REJECTED"]:
             # In a real app, pass the specific email data
            send_status_update_email.delay(user_id, type, title)

    async def notify_status_change(self, seeker_id: str, job_title: str, company_name: str, new_stage: str):
        title = f"Application Update: {job_title}"
        body = f"Your application to {company_name} is now {new_stage}."
        await self.create_notification(seeker_id, new_stage, title, body, "/applications")
