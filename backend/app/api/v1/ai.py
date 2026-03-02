import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CoachRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

HIRING_COACH_SYSTEM = """You are an expert AI Hiring Coach for TechHire, a tech recruitment platform based in Kenya. You help employers with:
- Writing compelling job descriptions for tech roles
- Preparing technical and behavioral interview questions
- Evaluating candidate profiles and resumes
- Drafting professional offer letters
- Salary benchmarking in KES and compensation advice for the Kenyan market
- Building diverse and inclusive hiring pipelines
- Onboarding best practices
Be concise, practical, and actionable. Use bullet points and structure when helpful."""

CAREER_COACH_SYSTEM = """You are an expert AI Career Coach for TechHire, a tech recruitment platform based in Kenya. You help job seekers with:
- Optimizing resumes and LinkedIn profiles for tech roles
- Preparing for technical interviews (coding, system design, behavioral)
- Writing personalized cover letters
- Negotiating job offers and salaries in KES for the Kenyan market
- Career path advice and skill gap analysis
- Portfolio and GitHub profile tips
- Job search strategy and networking in Kenya's tech scene
Be encouraging, practical, and specific. Use bullet points when helpful."""


async def call_claude(system: str, message: str, history: List[ChatMessage]) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set in environment")

    messages = []
    for h in history[-10:]:  # keep last 10 messages for context
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1000,
                "system": system,
                "messages": messages,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {response.text}")

    data = response.json()
    return data["content"][0]["text"]


@router.post("/hiring-coach")
async def hiring_coach(req: CoachRequest):
    reply = await call_claude(HIRING_COACH_SYSTEM, req.message, req.history)
    return {"response": reply}


@router.post("/career-coach")
async def career_coach(req: CoachRequest):
    reply = await call_claude(CAREER_COACH_SYSTEM, req.message, req.history)
    return {"response": reply}