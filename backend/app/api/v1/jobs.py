from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from typing import List
from app.models.job import JobPostingModel
from bson import ObjectId

router = APIRouter()

@router.get("/")
async def get_jobs(db=Depends(get_db)):
    cursor = db.job_postings.find()
    jobs = []
    async for job in cursor:
        # Convert ObjectId to string for JSON serialization
        job["_id"] = str(job["_id"])
        # Format for frontend expectation
        formatted_job = {
            "id": job["_id"],
            "title": job.get("title", "Untitled Job"),
            "company": job.get("company_name", "TechHire Partner"),
            "location": job.get("location", "Remote"),
            "salary": f"${job.get('salary_min', 0)//1000}k - ${job.get('salary_max', 0)//1000}k" if job.get('salary_min') else "Competitive",
            "type": job.get("type", "Full-Time"),
            "match": job.get("match", 85) # Default match for now
        }
        jobs.append(formatted_job)
    return jobs

@router.get("/{job_id}")
async def get_job_detail(job_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid Job ID")
    
    job = await db.job_postings.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job["_id"] = str(job["_id"])
    return job

@router.post("/{job_id}/apply")
async def apply_to_job(job_id: str, seeker_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(job_id) or not ObjectId.is_valid(seeker_id):
        raise HTTPException(status_code=400, detail="Invalid Job or Seeker ID")
    
    # Check if job exists
    job = await db.job_postings.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if existing application
    existing = await db.applications.find_one({
        "job_id": ObjectId(job_id),
        "seeker_id": ObjectId(seeker_id)
    })
    if existing:
        return {"msg": "Already applied", "app_id": str(existing["_id"])}
    
    # Create application
    from datetime import datetime
    new_app = {
        "job_id": ObjectId(job_id),
        "seeker_id": ObjectId(seeker_id),
        "stage": "APPLIED",
        "created_at": str(datetime.utcnow())
    }
    
    result = await db.applications.insert_one(new_app)
    return {"msg": "Application submitted", "app_id": str(result.inserted_id)}
