from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# ── Seeker Stats ──────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_seeker_stats(seeker_id: str, db=Depends(get_db)):
    """Profile strength, application count, interview count, saved jobs."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)

    user = await db.users.find_one({"_id": sid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Profile strength — based on filled fields
    profile_fields = ["full_name", "current_role", "skills", "bio", "location", "resume_url", "linkedin_url"]
    filled = sum(1 for f in profile_fields if user.get(f))
    profile_strength = round((filled / len(profile_fields)) * 100)

    total_applications = await db.applications.count_documents({"seeker_id": sid})
    interviews = await db.interviews.count_documents({"candidate_id": sid, "status": "scheduled"})
    saved_jobs = await db.saved_jobs.count_documents({"seeker_id": sid})

    return {
        "profile_strength": profile_strength,
        "total_applications": total_applications,
        "interviews": interviews,
        "saved_jobs": saved_jobs,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ── My Applications (Pipeline) ────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/applications")
async def get_my_applications(seeker_id: str, db=Depends(get_db)):
    """All applications for this seeker with job + company info."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)
    result = []

    async for app in db.applications.find(
        {"seeker_id": sid}
    ).sort("applied_at", -1):
        job = await db.job_postings.find_one({"_id": app["job_id"]})
        if not job:
            continue

        employer = await db.users.find_one({"_id": job.get("employer_id")})
        company_name = employer.get("company_name", "Company") if employer else job.get("company_name", "Company")

        applied_at = app.get("applied_at", datetime.utcnow())
        if isinstance(applied_at, str):
            applied_at = datetime.fromisoformat(applied_at)
        days_ago = (datetime.utcnow() - applied_at).days

        result.append({
            "id": str(app["_id"]),
            "job_id": str(app["job_id"]),
            "job_title": job.get("title", "Untitled"),
            "company": company_name,
            "location": job.get("location", "Remote"),
            "type": job.get("type", "Full Time"),
            "stage": app.get("stage", "APPLIED"),
            "match_score": app.get("match_score", 0),
            "days_ago": days_ago,
            "applied_at": applied_at.isoformat(),
        })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# ── My Interviews ─────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/interviews")
async def get_my_interviews(seeker_id: str, db=Depends(get_db)):
    """Upcoming and past interviews for this seeker."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)
    result = []

    async for interview in db.interviews.find(
        {"candidate_id": sid}
    ).sort("scheduled_at", 1):
        job = await db.job_postings.find_one({"_id": interview.get("job_id")})
        employer = None
        if job:
            employer = await db.users.find_one({"_id": job.get("employer_id")})

        company_name = "Company"
        if employer:
            company_name = employer.get("company_name", employer.get("full_name", "Company"))
        elif job:
            company_name = job.get("company_name", "Company")

        scheduled_at = interview.get("scheduled_at", datetime.utcnow())

        result.append({
            "id": str(interview["_id"]),
            "job_title": job.get("title", "Interview") if job else "Interview",
            "company": company_name,
            "scheduled_at": scheduled_at.isoformat(),
            "interview_type": interview.get("interview_type", "Video Call"),
            "status": interview.get("status", "scheduled"),
        })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# ── Job Recommendations (AI Match) ────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/recommendations")
async def get_job_recommendations(seeker_id: str, db=Depends(get_db)):
    """
    Returns jobs sorted by match_score from the matches collection,
    or falls back to active jobs if no matches exist yet.
    """
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)

    # Get already-applied job IDs to exclude
    applied_job_ids = set()
    async for app in db.applications.find({"seeker_id": sid}, {"job_id": 1}):
        applied_job_ids.add(app["job_id"])

    result = []

    # Try matches collection first (populated by your AI matching engine)
    matches_exist = await db.job_matches.find_one({"seeker_id": sid})

    if matches_exist:
        async for match in db.job_matches.find(
            {"seeker_id": sid, "job_id": {"$nin": list(applied_job_ids)}}
        ).sort("score", -1).limit(10):
            job = await db.job_postings.find_one({"_id": match["job_id"], "active": True})
            if not job:
                continue
            employer = await db.users.find_one({"_id": job.get("employer_id")})
            company_name = employer.get("company_name", "Company") if employer else "Company"

            result.append({
                "id": str(job["_id"]),
                "title": job.get("title", "Untitled"),
                "company": company_name,
                "location": job.get("location", "Remote"),
                "type": job.get("type", "Full Time"),
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                "match_score": match.get("score", 80),
                "experience_level": job.get("experience_level", "Mid Level"),
            })
    else:
        # Fallback: return recent active jobs
        async for job in db.job_postings.find(
            {"active": True, "_id": {"$nin": list(applied_job_ids)}}
        ).sort("created_at", -1).limit(10):
            employer = await db.users.find_one({"_id": job.get("employer_id")})
            company_name = employer.get("company_name", "Company") if employer else "Company"

            result.append({
                "id": str(job["_id"]),
                "title": job.get("title", "Untitled"),
                "company": company_name,
                "location": job.get("location", "Remote"),
                "type": job.get("type", "Full Time"),
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                "match_score": None,  # No AI score yet
                "experience_level": job.get("experience_level", "Mid Level"),
            })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# ── Browse / Search Jobs ──────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs/browse")
async def browse_jobs(
    seeker_id: str,
    search: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    db=Depends(get_db)
):
    """Browse and search all active job postings with optional filters."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)

    # Build filter
    query: dict = {"active": True}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"skills": {"$regex": search, "$options": "i"}},
        ]
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if job_type:
        query["type"] = job_type
    if experience_level:
        query["experience_level"] = experience_level

    # Get applied job IDs
    applied_job_ids = set()
    async for app in db.applications.find({"seeker_id": sid}, {"job_id": 1}):
        applied_job_ids.add(app["job_id"])

    # Get saved job IDs
    saved_job_ids = set()
    async for s in db.saved_jobs.find({"seeker_id": sid}, {"job_id": 1}):
        saved_job_ids.add(s["job_id"])

    result = []
    async for job in db.job_postings.find(query).sort("created_at", -1).limit(50):
        employer = await db.users.find_one({"_id": job.get("employer_id")})
        company_name = employer.get("company_name", "Company") if employer else "Company"

        created_at = job.get("created_at", datetime.utcnow())
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        days_ago = (datetime.utcnow() - created_at).days

        # Check for AI match score
        match = await db.job_matches.find_one({"seeker_id": sid, "job_id": job["_id"]})

        result.append({
            "id": str(job["_id"]),
            "title": job.get("title", "Untitled"),
            "company": company_name,
            "location": job.get("location", "Remote"),
            "type": job.get("type", "Full Time"),
            "experience_level": job.get("experience_level", "Mid Level"),
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
            "description": job.get("description", ""),
            "skills": job.get("skills", []),
            "days_ago": days_ago,
            "match_score": match.get("score") if match else None,
            "already_applied": job["_id"] in applied_job_ids,
            "saved": job["_id"] in saved_job_ids,
        })

    return result


# ── Apply to a Job ─────────────────────────────────────────────────────────────
@router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, body: dict, db=Depends(get_db)):
    """
    Apply to a job.
    Body: { "seeker_id": "..." }
    """
    seeker_id = body.get("seeker_id")
    if not ObjectId.is_valid(job_id) or not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid IDs")

    sid = ObjectId(seeker_id)
    jid = ObjectId(job_id)

    job = await db.job_postings.find_one({"_id": jid, "active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    # Check if already applied
    existing = await db.applications.find_one({"seeker_id": sid, "job_id": jid})
    if existing:
        raise HTTPException(status_code=409, detail="Already applied to this job")

    now = datetime.utcnow()
    result = await db.applications.insert_one({
        "seeker_id": sid,
        "job_id": jid,
        "stage": "APPLIED",
        "match_score": 0,
        "applied_at": now,
        "created_at": now,
    })

    return {"msg": "Application submitted", "application_id": str(result.inserted_id)}


# ── Save / Unsave a Job ────────────────────────────────────────────────────────
@router.post("/jobs/{job_id}/save")
async def toggle_save_job(job_id: str, body: dict, db=Depends(get_db)):
    """Toggle save/unsave a job. Body: { "seeker_id": "..." }"""
    seeker_id = body.get("seeker_id")
    if not ObjectId.is_valid(job_id) or not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid IDs")

    sid = ObjectId(seeker_id)
    jid = ObjectId(job_id)

    existing = await db.saved_jobs.find_one({"seeker_id": sid, "job_id": jid})
    if existing:
        await db.saved_jobs.delete_one({"_id": existing["_id"]})
        return {"saved": False}
    else:
        await db.saved_jobs.insert_one({
            "seeker_id": sid,
            "job_id": jid,
            "saved_at": datetime.utcnow()
        })
        return {"saved": True}


# ══════════════════════════════════════════════════════════════════════════════
# ── Messages (Seeker Side) ────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/conversations")
async def get_seeker_conversations(seeker_id: str, db=Depends(get_db)):
    """List all conversations for a seeker, newest first."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    sid = ObjectId(seeker_id)
    result = []

    async for conv in db.conversations.find(
        {"candidate_id": sid}
    ).sort("updated_at", -1):
        employer = await db.users.find_one({"_id": conv["employer_id"]})
        if not employer:
            continue

        last_msg = await db.messages.find_one(
            {"conversation_id": conv["_id"]},
            sort=[("created_at", -1)]
        )

        # Unread = messages from employer not yet read
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["_id"],
            "sender": "employer",
            "read": {"$ne": True}
        })

        company_name = employer.get("company_name", employer.get("full_name", "Employer"))
        initials = "".join(p[0].upper() for p in company_name.split()[:2])

        # Format time
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
            "employer_id": str(conv["employer_id"]),
            "employer_name": company_name,
            "employer_avatar": initials,
            "last_message": last_msg["text"] if last_msg else "",
            "last_message_time": last_time,
            "unread_count": unread_count,
        })

    return result


@router.get("/conversations/{conversation_id}/messages")
async def get_seeker_messages(conversation_id: str, db=Depends(get_db)):
    """Return all messages in a conversation. Marks employer messages as read."""
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv_id = ObjectId(conversation_id)

    conv = await db.conversations.find_one({"_id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark employer messages as read
    await db.messages.update_many(
        {"conversation_id": conv_id, "sender": "employer", "read": {"$ne": True}},
        {"$set": {"read": True}}
    )

    messages = []
    async for msg in db.messages.find(
        {"conversation_id": conv_id}
    ).sort("created_at", 1):
        messages.append({
            "id": str(msg["_id"]),
            "sender": msg.get("sender", "employer"),
            "text": msg.get("text", ""),
            "created_at": msg["created_at"].isoformat(),
        })

    return messages


@router.post("/conversations/{conversation_id}/messages")
async def send_seeker_message(conversation_id: str, body: dict, db=Depends(get_db)):
    """
    Send a message from the seeker.
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
        "sender": "candidate",
        "text": text,
        "read": False,
        "created_at": now,
    }

    result = await db.messages.insert_one(new_msg)
    await db.conversations.update_one(
        {"_id": conv_id},
        {"$set": {"updated_at": now}}
    )

    return {
        "id": str(result.inserted_id),
        "sender": "candidate",
        "text": text,
        "created_at": now.isoformat(),
    }
# ══════════════════════════════════════════════════════════════════════════════
# ── Seeker Profile ────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/profile")
async def get_seeker_profile(seeker_id: str, db=Depends(get_db)):
    """Get seeker profile data."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    user = await db.users.find_one({"_id": ObjectId(seeker_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone", ""),
        "location": user.get("location", ""),
        "current_role": user.get("current_role", ""),
        "bio": user.get("bio", ""),
        "skills": user.get("skills", []),
        "years_experience": user.get("years_experience", 0),
        "linkedin_url": user.get("linkedin_url", ""),
        "resume_url": user.get("resume_url", ""),
    }


@router.put("/profile")
async def update_seeker_profile(seeker_id: str, body: dict, db=Depends(get_db)):
    """Update seeker profile fields."""
    if not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid seeker ID")

    allowed_fields = [
        "full_name", "phone", "location", "current_role",
        "bio", "skills", "years_experience", "linkedin_url"
    ]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    update_data["updated_at"] = datetime.utcnow()

    result = await db.users.update_one(
        {"_id": ObjectId(seeker_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"msg": "Profile updated successfully"}
