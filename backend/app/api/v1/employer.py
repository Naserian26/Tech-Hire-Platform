from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.services.notification_service import NotificationService
from app.tasks.email_tasks import send_status_update_email
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


# ── Existing: Update Application Stage ────────────────────────────────────────
@router.put("/applications/{app_id}/stage")
async def update_stage(app_id: str, stage_data: dict, db=Depends(get_db)):
    app = await db.applications.find_one_and_update(
        {"_id": ObjectId(app_id)},
        {"$set": {"stage": stage_data["stage"]}},
        return_document=True
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.job_postings.find_one({"_id": app["job_id"]})
    seeker = await db.users.find_one({"_id": app["seeker_id"]})

    notif_service = NotificationService(db)
    await notif_service.notify_status_change(
        str(app["seeker_id"]),
        job["title"],
        job.get("company_name", "Company"),
        stage_data["stage"]
    )

    if seeker and job:
        send_status_update_email.delay(
            to_email=seeker["email"],
            user_name=seeker.get("full_name", "Candidate"),
            stage=stage_data["stage"],
            company_name=job.get("company_name", "Company"),
            job_title=job["title"]
        )

    return {"msg": "Stage updated"}


# ── Dashboard Stats ────────────────────────────────────────────────────────────
@router.get("/stats")
async def get_employer_stats(employer_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)

    jobs_posted = await db.job_postings.count_documents({"employer_id": eid})
    jobs_closed = await db.job_postings.count_documents({"employer_id": eid, "active": False})

    job_ids = []
    async for job in db.job_postings.find({"employer_id": eid}, {"_id": 1}):
        job_ids.append(job["_id"])

    total_applicants = await db.applications.count_documents({"job_id": {"$in": job_ids}})
    hired = await db.applications.count_documents({
        "job_id": {"$in": job_ids},
        "stage": "HIRED"
    })

    hire_success = round((hired / total_applicants * 100)) if total_applicants > 0 else 0

    return {
        "jobs_posted": jobs_posted,
        "total_applicants": total_applicants,
        "jobs_closed": jobs_closed,
        "hire_success": f"{hire_success}%"
    }


# ── Hiring Pipeline ────────────────────────────────────────────────────────────
@router.get("/pipeline")
async def get_pipeline(employer_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)

    job_ids = []
    async for job in db.job_postings.find({"employer_id": eid}, {"_id": 1}):
        job_ids.append(job["_id"])

    stages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"]
    pipeline = []
    for stage in stages:
        count = await db.applications.count_documents({
            "job_id": {"$in": job_ids},
            "stage": stage
        })
        pipeline.append({"stage": stage.capitalize(), "count": count})

    return pipeline


# ── Top Candidates ─────────────────────────────────────────────────────────────
@router.get("/candidates")
async def get_top_candidates(employer_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)

    job_ids = []
    async for job in db.job_postings.find({"employer_id": eid}, {"_id": 1}):
        job_ids.append(job["_id"])

    candidates = []
    async for app in db.applications.find(
        {"job_id": {"$in": job_ids}}
    ).sort("match_score", -1).limit(10):
        seeker = await db.users.find_one({"_id": app["seeker_id"]})
        job = await db.job_postings.find_one({"_id": app["job_id"]})
        if seeker and job:
            full_name = seeker.get("full_name", seeker.get("email", "Unknown"))
            initials = "".join(p[0].upper() for p in full_name.split()[:2])
            candidates.append({
                "id": str(app["_id"]),
                "name": full_name,
                "role": seeker.get("current_role", job["title"]),
                "score": app.get("match_score", 80),
                "status": app.get("stage", "APPLIED").lower(),
                "avatar": initials,
                "job": job["title"],
                "job_id": str(app["job_id"]),
            })

    return candidates


# ── Employer Jobs ──────────────────────────────────────────────────────────────
@router.get("/jobs")
async def get_employer_jobs(employer_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)
    jobs = []

    async for job in db.job_postings.find(
        {"employer_id": eid}
    ).sort("created_at", -1).limit(10):
        job_id = job["_id"]
        applicant_count = await db.applications.count_documents({"job_id": job_id})

        created_at = job.get("created_at")
        days_ago = 0
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            days_ago = (datetime.utcnow() - created_at).days

        jobs.append({
            "id": str(job_id),
            "title": job.get("title", "Untitled"),
            "location": job.get("location", "Remote"),
            "type": job.get("type", "Full Time"),
            "applicants": applicant_count,
            "days_ago": days_ago,
            "active": job.get("active", True)
        })

    return jobs


# ── Create Job Posting ─────────────────────────────────────────────────────────
@router.post("/jobs")
async def create_job(job_data: dict, db=Depends(get_db)):
    employer_id = job_data.get("employer_id")
    if not employer_id or not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    new_job = {
        "employer_id": ObjectId(employer_id),
        "title": job_data.get("title", ""),
        "description": job_data.get("description", ""),
        "location": job_data.get("location", "Remote"),
        "type": job_data.get("type", "Full Time"),
        "salary_min": job_data.get("salary_min"),
        "salary_max": job_data.get("salary_max"),
        "experience_level": job_data.get("experience_level", "Mid Level"),
        "skills": job_data.get("skills", []),
        "active": True,
        "created_at": datetime.utcnow()
    }

    result = await db.job_postings.insert_one(new_job)
    return {"msg": "Job posted successfully", "job_id": str(result.inserted_id)}


# ══════════════════════════════════════════════════════════════════════════════
# ── NEW: Conversations (Messages Tab) ─────────────────────────────────────────
# Collection: `conversations`
# Document shape:
#   { employer_id, candidate_id, created_at }
#
# Collection: `messages`
# Document shape:
#   { conversation_id, sender: "employer"|"candidate", text, created_at }
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/conversations")
async def get_conversations(employer_id: str, db=Depends(get_db)):
    """
    List all conversations for an employer, newest first.
    Returns each conversation enriched with candidate info and last message.
    """
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)
    result = []

    async for conv in db.conversations.find(
        {"employer_id": eid}
    ).sort("updated_at", -1):
        candidate = await db.users.find_one({"_id": conv["candidate_id"]})
        if not candidate:
            continue

        # Get last message for preview
        last_msg = await db.messages.find_one(
            {"conversation_id": conv["_id"]},
            sort=[("created_at", -1)]
        )

        # Count unread messages sent by candidate
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["_id"],
            "sender": "candidate",
            "read": {"$ne": True}
        })

        full_name = candidate.get("full_name", candidate.get("email", "Unknown"))
        initials = "".join(p[0].upper() for p in full_name.split()[:2])

        # Format time nicely
        last_time = ""
        if last_msg:
            msg_time = last_msg.get("created_at", datetime.utcnow())
            now = datetime.utcnow()
            diff = now - msg_time
            if diff.days == 0:
                hours = diff.seconds // 3600
                minutes = diff.seconds // 60
                if hours >= 1:
                    last_time = f"{hours}h ago"
                elif minutes >= 1:
                    last_time = f"{minutes}m ago"
                else:
                    last_time = "Just now"
            elif diff.days == 1:
                last_time = "Yesterday"
            else:
                last_time = msg_time.strftime("%b %d")

        result.append({
            "id": str(conv["_id"]),
            "candidate_id": str(conv["candidate_id"]),
            "candidate_name": full_name,
            "candidate_role": candidate.get("current_role", "Candidate"),
            "candidate_avatar": initials,
            "last_message": last_msg["text"] if last_msg else "",
            "last_message_time": last_time,
            "unread_count": unread_count,
        })

    return result


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, db=Depends(get_db)):
    """
    Return all messages in a conversation, oldest first.
    Also marks all candidate messages as read.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv_id = ObjectId(conversation_id)

    # Verify conversation exists
    conv = await db.conversations.find_one({"_id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark candidate messages as read
    await db.messages.update_many(
        {"conversation_id": conv_id, "sender": "candidate", "read": {"$ne": True}},
        {"$set": {"read": True}}
    )

    messages = []
    async for msg in db.messages.find(
        {"conversation_id": conv_id}
    ).sort("created_at", 1):
        messages.append({
            "id": str(msg["_id"]),
            "sender": msg.get("sender", "candidate"),  # "employer" | "candidate"
            "text": msg.get("text", ""),
            "created_at": msg["created_at"].isoformat(),
        })

    return messages


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, body: dict, db=Depends(get_db)):
    """
    Send a message from the employer in a conversation.
    Body: { "text": "..." }
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")

    conv_id = ObjectId(conversation_id)

    conv = await db.conversations.find_one({"_id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.utcnow()
    new_msg = {
        "conversation_id": conv_id,
        "sender": "employer",
        "text": text,
        "read": False,
        "created_at": now,
    }

    result = await db.messages.insert_one(new_msg)

    # Update conversation's updated_at so it sorts to top
    await db.conversations.update_one(
        {"_id": conv_id},
        {"$set": {"updated_at": now}}
    )

    return {
        "id": str(result.inserted_id),
        "sender": "employer",
        "text": text,
        "created_at": now.isoformat(),
    }


# ── UTILITY: Start a new conversation (call this when employer first messages a candidate)
@router.post("/conversations")
async def start_conversation(body: dict, db=Depends(get_db)):
    """
    Start a conversation between employer and candidate.
    Body: { "employer_id": "...", "candidate_id": "..." }
    Returns existing conversation if one already exists.
    """
    employer_id = body.get("employer_id")
    candidate_id = body.get("candidate_id")

    if not ObjectId.is_valid(employer_id) or not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=400, detail="Invalid IDs")

    eid = ObjectId(employer_id)
    cid = ObjectId(candidate_id)

    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "employer_id": eid,
        "candidate_id": cid
    })
    if existing:
        return {"id": str(existing["_id"]), "existing": True}

    now = datetime.utcnow()
    result = await db.conversations.insert_one({
        "employer_id": eid,
        "candidate_id": cid,
        "created_at": now,
        "updated_at": now,
    })

    return {"id": str(result.inserted_id), "existing": False}


# ══════════════════════════════════════════════════════════════════════════════
# ── NEW: Interviews Tab ────────────────────────────────────────────────────────
# Collection: `interviews`
# Document shape:
#   {
#     employer_id, candidate_id, job_id,
#     scheduled_at (datetime),
#     interview_type: "Video Call" | "Phone Screen" | "On-site",
#     status: "scheduled" | "completed" | "cancelled",
#     created_at
#   }
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/interviews/stats")
async def get_interview_stats(employer_id: str, db=Depends(get_db)):
    """
    Returns scheduled, this_week, and completed interview counts.
    """
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)
    now = datetime.utcnow()

    # Start and end of current week (Monday–Sunday)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    scheduled = await db.interviews.count_documents({
        "employer_id": eid,
        "status": "scheduled"
    })

    this_week = await db.interviews.count_documents({
        "employer_id": eid,
        "status": "scheduled",
        "scheduled_at": {"$gte": week_start, "$lt": week_end}
    })

    completed = await db.interviews.count_documents({
        "employer_id": eid,
        "status": "completed"
    })

    return {
        "scheduled": scheduled,
        "this_week": this_week,
        "completed": completed,
    }


@router.get("/interviews")
async def get_interviews(employer_id: str, db=Depends(get_db)):
    """
    Returns all interviews for an employer, sorted by scheduled_at ascending.
    Enriches each with candidate name, role, and avatar initials.
    """
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    eid = ObjectId(employer_id)
    result = []

    async for interview in db.interviews.find(
        {"employer_id": eid}
    ).sort("scheduled_at", 1):
        candidate = await db.users.find_one({"_id": interview["candidate_id"]})
        if not candidate:
            continue

        full_name = candidate.get("full_name", candidate.get("email", "Unknown"))
        initials = "".join(p[0].upper() for p in full_name.split()[:2])

        scheduled_at = interview.get("scheduled_at", datetime.utcnow())

        result.append({
            "id": str(interview["_id"]),
            "candidate_id": str(interview["candidate_id"]),
            "candidate_name": full_name,
            "candidate_role": candidate.get("current_role", "Candidate"),
            "candidate_avatar": initials,
            "scheduled_at": scheduled_at.isoformat(),   # frontend formats this → "Today · 2:00 PM"
            "interview_type": interview.get("interview_type", "Video Call"),
            "status": interview.get("status", "scheduled"),
        })

    return result


@router.post("/interviews")
async def schedule_interview(body: dict, db=Depends(get_db)):
    """
    Schedule a new interview.
    Body: {
        "employer_id": "...",
        "candidate_id": "...",
        "job_id": "...",
        "scheduled_at": "2026-03-01T15:30:00",   # ISO datetime string
        "interview_type": "Video Call"             # or "Phone Screen" | "On-site"
    }
    """
    employer_id = body.get("employer_id")
    candidate_id = body.get("candidate_id")
    job_id = body.get("job_id")

    if not all([employer_id, candidate_id, job_id]):
        raise HTTPException(status_code=400, detail="employer_id, candidate_id, job_id are required")

    for field, val in [("employer_id", employer_id), ("candidate_id", candidate_id), ("job_id", job_id)]:
        if not ObjectId.is_valid(val):
            raise HTTPException(status_code=400, detail=f"Invalid {field}")

    scheduled_at_str = body.get("scheduled_at")
    try:
        scheduled_at = datetime.fromisoformat(scheduled_at_str)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid scheduled_at — use ISO format e.g. 2026-03-01T15:30:00")

    interview_type = body.get("interview_type", "Video Call")
    if interview_type not in ("Video Call", "Phone Screen", "On-site"):
        raise HTTPException(status_code=400, detail="interview_type must be 'Video Call', 'Phone Screen', or 'On-site'")

    now = datetime.utcnow()
    new_interview = {
        "employer_id": ObjectId(employer_id),
        "candidate_id": ObjectId(candidate_id),
        "job_id": ObjectId(job_id),
        "scheduled_at": scheduled_at,
        "interview_type": interview_type,
        "status": "scheduled",
        "created_at": now,
    }

    result = await db.interviews.insert_one(new_interview)
    return {"msg": "Interview scheduled", "interview_id": str(result.inserted_id)}


@router.put("/interviews/{interview_id}/status")
async def update_interview_status(interview_id: str, body: dict, db=Depends(get_db)):
    """
    Update interview status.
    Body: { "status": "completed" | "cancelled" }
    """
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    status = body.get("status")
    if status not in ("scheduled", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="status must be 'scheduled', 'completed', or 'cancelled'")

    interview = await db.interviews.find_one_and_update(
        {"_id": ObjectId(interview_id)},
        {"$set": {"status": status}},
        return_document=True
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {"msg": "Interview status updated"}
# ══════════════════════════════════════════════════════════════════════════════
# ── Employer Profile ──────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/profile")
async def get_employer_profile(employer_id: str, db=Depends(get_db)):
    """Get employer profile data."""
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    user = await db.users.find_one({"_id": ObjectId(employer_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "company_name": user.get("company_name", ""),
        "phone": user.get("phone", ""),
        "location": user.get("location", ""),
        "industry": user.get("industry", ""),
        "company_size": user.get("company_size", ""),
        "website": user.get("website", ""),
        "description": user.get("description", ""),
    }


@router.put("/profile")
async def update_employer_profile(employer_id: str, body: dict, db=Depends(get_db)):
    """Update employer profile fields."""
    if not ObjectId.is_valid(employer_id):
        raise HTTPException(status_code=400, detail="Invalid employer ID")

    allowed_fields = [
        "company_name", "phone", "location", "industry",
        "company_size", "website", "description"
    ]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    update_data["updated_at"] = datetime.utcnow()

    result = await db.users.update_one(
        {"_id": ObjectId(employer_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"msg": "Profile updated successfully"}