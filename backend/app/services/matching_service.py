"""
matching_service.py  —  TechHire AI Matching Engine  (3-Layer)
===============================================================
Save to: backend/app/services/matching_service.py

HOW IT WORKS
─────────────
Layer 1 │ Rule-based      │ Salary, location, experience, job type  (always runs, free)
Layer 2 │ TF-IDF          │ Document similarity on bio + description (always runs, free)
Layer 3 │ Claude API      │ Deep contextual intelligence             (top-N only, smart)

Final score = weighted blend of all three layers → 0–100

INSTALLATION
─────────────
pip install scikit-learn httpx   (both are lightweight, no GPU needed)

WIRING (3 lines in your existing routes)
──────────────────────────────────────────
seeker.py  → apply_to_job()         : await MatchingService.score_and_patch_application(db, app_id)
seeker.py  → update_seeker_profile(): await MatchingService.compute_and_store_matches(db, seeker_id)
employer.py→ create_job()           : await MatchingService.compute_and_store_matches_for_job(db, job_id)
"""

from __future__ import annotations

import re
import os
import math
import json
import logging
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL      = "claude-sonnet-4-20250514"

# How many top candidates/jobs get the expensive Claude layer
CLAUDE_TOP_N = 10

# Layer weights for final score blend
W_RULES  = 0.40   # 40% rule-based
W_TFIDF  = 0.25   # 25% TF-IDF cosine similarity
W_CLAUDE = 0.35   # 35% Claude AI (only applied to top-N, others extrapolate)


# ─────────────────────────────────────────────────────────────────────────────
# Constants & lookup tables
# ─────────────────────────────────────────────────────────────────────────────

EXPERIENCE_LEVELS = [
    "Internship", "Entry Level", "Junior",
    "Mid Level", "Senior", "Lead", "Executive"
]

EXPECTED_YEARS_PER_LEVEL = [0, 0.5, 2, 4, 7, 9, 12]

SKILL_ALIASES: Dict[str, str] = {
    "react.js": "react",    "reactjs": "react",
    "vue.js":   "vue",      "vuejs":   "vue",
    "node.js":  "node",     "nodejs":  "node",
    "next.js":  "nextjs",   "nuxt.js": "nuxtjs",
    "express.js": "express","expressjs": "express",
    "typescript": "ts",     "javascript": "js",
    "postgresql": "postgres","mongo": "mongodb",
    "k8s": "kubernetes",    "tf": "tensorflow",
    "scikit-learn": "sklearn",
}

# Adjacent / related skill groups — matching any skill in the same group
# gives partial credit (0.5) even if the exact skill doesn't match
SKILL_GROUPS: List[set] = [
    {"react", "vue", "angular", "svelte", "nextjs", "nuxtjs"},          # Frontend frameworks
    {"node", "express", "fastapi", "django", "flask", "rails", "spring"},# Backend frameworks
    {"python", "ruby", "java", "go", "rust", "csharp", "php"},          # Backend languages
    {"js", "ts"},                                                         # JS family
    {"postgres", "mysql", "sqlite", "oracle"},                           # SQL databases
    {"mongodb", "dynamodb", "cassandra", "couchdb"},                     # NoSQL databases
    {"aws", "gcp", "azure"},                                             # Cloud providers
    {"docker", "kubernetes", "terraform", "ansible"},                    # DevOps
    {"tensorflow", "pytorch", "sklearn", "keras", "jax"},               # ML frameworks
    {"figma", "sketch", "xd", "invision"},                              # Design tools
    {"redux", "zustand", "mobx", "recoil"},                             # State management
    {"jest", "cypress", "playwright", "selenium"},                       # Testing
]

_STOP_WORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","could","should","may","might","shall","must","can",
    "not","no","nor","so","yet","both","either","neither","just","than","then",
    "that","this","these","those","we","our","you","your","they","their","it",
    "its","i","my","me","him","his","her","she","he","us","them","who","which",
    "what","when","where","why","how","all","each","every","few","more","most",
    "other","some","such","only","own","same","too","very","s","t","also",
    "from","up","about","into","through","during","before","after","once",
    "need","experience","working","work","team","role","position","candidate",
    "job","strong","good","excellent","ability","skills","skill","year","years",
}


# ─────────────────────────────────────────────────────────────────────────────
# Shared TF-IDF vectorizer (module-level singleton — no re-training needed)
# ─────────────────────────────────────────────────────────────────────────────

_vectorizer = TfidfVectorizer(
    stop_words=list(_STOP_WORDS),
    ngram_range=(1, 2),      # unigrams + bigrams ("machine learning", "full stack")
    min_df=1,
    max_features=5000,
    sublinear_tf=True,        # log-normalise term frequencies
)


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "")


def _normalise_skill(skill: str) -> str:
    s = skill.lower().strip()
    s = re.sub(r"[^a-z0-9.#+]", "", s)
    return SKILL_ALIASES.get(s, s)


def _skill_set(raw: Any) -> set:
    if not raw:
        return set()
    if isinstance(raw, str):
        raw = [s.strip() for s in re.split(r"[,;]", raw) if s.strip()]
    return {_normalise_skill(s) for s in raw if s}


def _exp_index(level: Optional[str]) -> int:
    if not level:
        return 3
    lc = level.lower().strip()
    for i, l in enumerate(EXPERIENCE_LEVELS):
        if l.lower() in lc or lc in l.lower():
            return i
    if "junior" in lc or "entry" in lc or "grad" in lc:  return 2
    if "senior" in lc or "sr." in lc:                     return 4
    if "lead" in lc or "principal" in lc:                 return 5
    if any(x in lc for x in ["exec","director","vp","cto","ceo"]): return 6
    return 3


def _adjacent_skill_bonus(seeker_skills: set, job_skills: set) -> float:
    """
    For each job skill the seeker is missing, check if they have an adjacent
    skill in the same group. Award 0.5 partial credit per adjacent match.
    """
    missing = job_skills - seeker_skills
    bonus = 0.0
    for job_skill in missing:
        for group in SKILL_GROUPS:
            if job_skill in group:
                # Seeker has at least one skill in the same group
                if group & seeker_skills:
                    bonus += 0.5
                    break
    return bonus


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1 — Rule-based scoring  (max 100, scaled to W_RULES later)
# ─────────────────────────────────────────────────────────────────────────────

def _l1_skills(seeker_skills: set, job_skills: set, job_desc: str) -> float:
    """40 pts. Exact overlap + adjacent skill bonus + description keywords."""
    desc_tokens = set(re.findall(r"[a-z][a-z0-9#+.]*", job_desc.lower()))
    augmented   = job_skills | {_normalise_skill(t) for t in desc_tokens if len(t) >= 3}

    if not augmented:
        return 20.0

    exact_matched = seeker_skills & augmented
    exact_ratio   = len(exact_matched) / len(augmented)
    adj_bonus     = _adjacent_skill_bonus(seeker_skills, augmented)

    raw = (exact_ratio * len(augmented) + adj_bonus) / len(augmented)
    return min(40.0, raw * 40.0)


def _l1_experience(seeker_years: int, seeker_level: Optional[str],
                   job_level: Optional[str]) -> float:
    """25 pts. Level gap + years heuristic."""
    ji = _exp_index(job_level)
    si = _exp_index(seeker_level)
    gap = abs(ji - si)

    # Over-qualified → mild penalty; under-qualified → harder penalty
    level_score = (max(0.6, 1.0 - gap * 0.1) if si > ji
                   else max(0.0, 1.0 - gap * 0.3))

    expected = EXPECTED_YEARS_PER_LEVEL[ji]
    years    = max(0, seeker_years or 0)
    years_score = 1.0 if expected == 0 else min(1.0, years / expected)

    return round((level_score * 0.6 + years_score * 0.4) * 25.0, 2)


def _l1_location(seeker_loc: str, job_loc: str, job_type: Optional[str]) -> float:
    """15 pts."""
    jl = (job_loc  or "").lower()
    sl = (seeker_loc or "").lower()
    is_remote = bool(job_type and "remote" in job_type.lower())

    if is_remote or "remote" in jl: return 15.0
    if "remote" in sl:              return 13.0
    if not jl or not sl:            return 7.5

    jcity = jl.split(",")[0].strip()
    scity = sl.split(",")[0].strip()
    if jcity and scity and jcity == scity:
        return 15.0

    jcountry = jl.split(",")[-1].strip()
    scountry = sl.split(",")[-1].strip()
    if jcountry and scountry and jcountry == scountry:
        return 7.5

    return 0.0


def _l1_salary(seeker_expected: Optional[int],
               job_min: Optional[int], job_max: Optional[int]) -> float:
    """
    10 pts (NEW). Penalises large salary mismatches.
    If seeker has no salary expectation stored → neutral 5 pts.
    """
    if not seeker_expected or (not job_min and not job_max):
        return 5.0   # no data → neutral

    # Use midpoint of job range
    if job_min and job_max:
        job_mid = (job_min + job_max) / 2
    elif job_max:
        job_mid = job_max
    else:
        job_mid = job_min

    ratio = seeker_expected / job_mid if job_mid else 1.0

    if 0.85 <= ratio <= 1.20:   return 10.0  # within ±20% → full marks
    if 0.70 <= ratio <= 1.40:   return 6.0   # within ±40% → partial
    if 0.50 <= ratio <= 1.60:   return 3.0   # stretch
    return 0.0                               # too far off


def _l1_job_type(seeker_preference: Optional[str], job_type: Optional[str]) -> float:
    """
    10 pts (NEW). Matches seeker's preferred work arrangement to job type.
    Stored on seeker profile as job_type_preference: "Remote"|"Hybrid"|"On-site"|"Any"
    """
    if not seeker_preference or seeker_preference.lower() == "any":
        return 7.0   # no preference → near-full

    sp = seeker_preference.lower()
    jt = (job_type or "").lower()

    if sp in jt or jt in sp:
        return 10.0
    # Hybrid is partially compatible with both remote and on-site
    if "hybrid" in jt and sp in ("remote", "on-site", "onsite"):
        return 5.0
    return 2.0


def _layer1_score(seeker: Dict, job: Dict) -> float:
    """
    Combines all rule-based sub-scores → 0–100.
    Sub-score max breakdown:
      Skills     40
      Experience 25
      Location   15
      Salary     10  ← NEW
      Job type   10  ← NEW
      ─────────────
      Total     100
    """
    sk = _skill_set(seeker.get("skills", []))
    jk = _skill_set(job.get("skills", []))
    jd = _strip_html(job.get("description", ""))

    s  = _l1_skills(sk, jk, jd)
    s += _l1_experience(seeker.get("years_experience", 0),
                        seeker.get("experience_level"),
                        job.get("experience_level"))
    s += _l1_location(seeker.get("location", ""),
                      job.get("location", ""),
                      job.get("type"))
    s += _l1_salary(seeker.get("salary_expectation"),
                    job.get("salary_min"), job.get("salary_max"))
    s += _l1_job_type(seeker.get("job_type_preference"), job.get("type"))

    return max(0.0, min(100.0, s))


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2 — TF-IDF Cosine Similarity  (0–100)
# ─────────────────────────────────────────────────────────────────────────────

def _build_seeker_document(seeker: Dict) -> str:
    """Concatenate all seeker text into one document for vectorisation."""
    parts = [
        seeker.get("full_name", ""),
        seeker.get("current_role", ""),
        seeker.get("bio", ""),
        " ".join(seeker.get("skills", []) if isinstance(seeker.get("skills"), list)
                 else (seeker.get("skills") or "").split(",")),
        seeker.get("experience_level", ""),
        seeker.get("location", ""),
    ]
    return " ".join(p for p in parts if p).strip()


def _build_job_document(job: Dict) -> str:
    """Concatenate all job text into one document for vectorisation."""
    parts = [
        job.get("title", ""),
        _strip_html(job.get("description", "")),
        " ".join(job.get("skills", []) if isinstance(job.get("skills"), list)
                 else (job.get("skills") or "").split(",")),
        job.get("experience_level", ""),
        job.get("location", ""),
        job.get("type", ""),
    ]
    return " ".join(p for p in parts if p).strip()


def _layer2_score(seeker: Dict, job: Dict) -> float:
    """
    TF-IDF cosine similarity between seeker document and job document.
    Returns 0–100.
    sklearn's TfidfVectorizer is already pre-built — no training on your data needed.
    """
    seeker_doc = _build_seeker_document(seeker)
    job_doc    = _build_job_document(job)

    if not seeker_doc.strip() or not job_doc.strip():
        return 50.0  # neutral fallback

    try:
        tfidf_matrix = _vectorizer.fit_transform([seeker_doc, job_doc])
        similarity   = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(float(similarity) * 100.0, 2)
    except Exception as e:
        logger.warning("TF-IDF scoring failed: %s", e)
        return 50.0


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3 — Claude AI Scoring  (0–100, async)
# ─────────────────────────────────────────────────────────────────────────────

_CLAUDE_PROMPT = """You are an expert technical recruiter AI. Score how well this candidate matches this job.

CANDIDATE PROFILE:
- Name: {name}
- Current Role: {current_role}
- Skills: {skills}
- Years of Experience: {years_experience}
- Experience Level: {experience_level}
- Location: {location}
- Bio: {bio}

JOB POSTING:
- Title: {title}
- Required Skills: {job_skills}
- Experience Level: {job_experience_level}
- Location: {job_location}
- Type: {job_type}
- Description: {description}

Analyse the match across:
1. Technical skill alignment (how well their skills match requirements)
2. Experience fit (level and years appropriate for role)
3. Context fit (does their background suggest success in this role)
4. Growth potential (could they grow into gaps if not 100% match)

Respond ONLY with a JSON object like this (no extra text):
{{
  "score": <integer 0-100>,
  "skill_fit": "<excellent|good|partial|poor>",
  "experience_fit": "<excellent|good|partial|poor>",
  "top_strength": "<one sentence>",
  "top_gap": "<one sentence or 'None'>",
  "summary": "<2 sentence recruiter summary>"
}}"""


async def _layer3_score_claude(seeker: Dict, job: Dict) -> Tuple[float, Dict]:
    """
    Calls Claude API to get an intelligent match score.
    Returns (score 0-100, detail_dict).
    Falls back to 50.0 if API call fails.
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — skipping Claude layer")
        return 50.0, {}

    skills_str    = (", ".join(seeker.get("skills", []))
                     if isinstance(seeker.get("skills"), list)
                     else str(seeker.get("skills", "")))
    job_skills_str = (", ".join(job.get("skills", []))
                      if isinstance(job.get("skills"), list)
                      else str(job.get("skills", "")))
    description   = _strip_html(job.get("description", ""))[:1500]  # cap tokens

    prompt = _CLAUDE_PROMPT.format(
        name             = seeker.get("full_name", "Candidate"),
        current_role     = seeker.get("current_role", "N/A"),
        skills           = skills_str or "N/A",
        years_experience = seeker.get("years_experience", 0),
        experience_level = seeker.get("experience_level", "N/A"),
        location         = seeker.get("location", "N/A"),
        bio              = (seeker.get("bio", "") or "")[:500],
        title            = job.get("title", "N/A"),
        job_skills       = job_skills_str or "N/A",
        job_experience_level = job.get("experience_level", "N/A"),
        job_location     = job.get("location", "N/A"),
        job_type         = job.get("type", "N/A"),
        description      = description or "N/A",
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      CLAUDE_MODEL,
                    "max_tokens": 300,
                    "messages":   [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data    = resp.json()
            content = data["content"][0]["text"].strip()

            # Strip markdown fences if present
            content = re.sub(r"```json|```", "", content).strip()
            parsed  = json.loads(content)

            score = max(0, min(100, int(parsed.get("score", 50))))
            return float(score), parsed

    except Exception as e:
        logger.warning("Claude scoring failed: %s", e)
        return 50.0, {}


# ─────────────────────────────────────────────────────────────────────────────
# Final blended score
# ─────────────────────────────────────────────────────────────────────────────

def _blend(l1: float, l2: float, l3: Optional[float] = None) -> int:
    """
    Blend all three layers into a final 0–100 score.
    If Claude score unavailable, redistribute its weight between L1 and L2.
    """
    if l3 is not None:
        score = l1 * W_RULES + l2 * W_TFIDF + l3 * W_CLAUDE
    else:
        # Fallback weights when Claude not called
        w1 = W_RULES  / (W_RULES + W_TFIDF)
        w2 = W_TFIDF  / (W_RULES + W_TFIDF)
        score = l1 * w1 + l2 * w2

    return max(0, min(100, round(score)))


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

class MatchingService:
    """
    3-layer AI matching engine.

    Synchronous (fast, no API call):
        MatchingService.score_fast(seeker, job) → int

    Asynchronous (full 3-layer with Claude):
        await MatchingService.score_full(seeker, job) → int

    Async DB batch helpers:
        await MatchingService.compute_and_store_matches(db, seeker_id)
        await MatchingService.compute_and_store_matches_for_job(db, job_id)
        await MatchingService.score_and_patch_application(db, application_id)
    """

    @classmethod
    def score_fast(cls, seeker: Dict, job: Dict) -> int:
        """
        Layers 1 + 2 only (synchronous, instant).
        Use for bulk scoring of many jobs at once.
        """
        l1 = _layer1_score(seeker, job)
        l2 = _layer2_score(seeker, job)
        return _blend(l1, l2)

    @classmethod
    async def score_full(cls, seeker: Dict, job: Dict) -> Tuple[int, Dict]:
        """
        All 3 layers including Claude AI (async).
        Use for top-N candidates where precision matters.
        Returns (score, claude_detail_dict).
        """
        l1 = _layer1_score(seeker, job)
        l2 = _layer2_score(seeker, job)
        l3, detail = await _layer3_score_claude(seeker, job)
        return _blend(l1, l2, l3), detail

    @classmethod
    def breakdown(cls, seeker: Dict, job: Dict) -> Dict:
        """
        Returns per-layer and per-factor detail. Useful for a
        'Why this score?' UI card or debugging.
        """
        sk = _skill_set(seeker.get("skills", []))
        jk = _skill_set(job.get("skills", []))
        jd = _strip_html(job.get("description", ""))

        l1 = _layer1_score(seeker, job)
        l2 = _layer2_score(seeker, job)

        return {
            "total_score":      _blend(l1, l2),
            "layer1_rules":     round(l1, 1),
            "layer2_tfidf":     round(l2, 1),
            "layer3_claude":    "call score_full() for Claude score",
            "skills_score":     round(_l1_skills(sk, jk, jd), 1),
            "experience_score": round(_l1_experience(
                                    seeker.get("years_experience", 0),
                                    seeker.get("experience_level"),
                                    job.get("experience_level")), 1),
            "location_score":   round(_l1_location(
                                    seeker.get("location", ""),
                                    job.get("location", ""),
                                    job.get("type")), 1),
            "salary_score":     round(_l1_salary(
                                    seeker.get("salary_expectation"),
                                    job.get("salary_min"),
                                    job.get("salary_max")), 1),
            "job_type_score":   round(_l1_job_type(
                                    seeker.get("job_type_preference"),
                                    job.get("type")), 1),
            "matched_skills":   sorted(sk & jk),
            "missing_skills":   sorted(jk - sk),
            "adjacent_bonus":   round(_adjacent_skill_bonus(sk, jk), 1),
        }

    # ── Async DB helpers ──────────────────────────────────────────────────────

    @classmethod
    async def compute_and_store_matches(cls, db, seeker_id: str) -> int:
        """
        Score ALL active jobs vs ONE seeker.
        Fast scores for all, then Claude for top CLAUDE_TOP_N.
        Upserts into job_matches collection.
        Call after: seeker registers or updates profile.
        """
        sid    = ObjectId(seeker_id)
        seeker = await db.users.find_one({"_id": sid})
        if not seeker:
            raise ValueError("Seeker not found")

        # Step 1: Fast-score all jobs
        scored: List[Tuple[Any, int]] = []
        async for job in db.job_postings.find({"active": True}):
            fast = cls.score_fast(seeker, job)
            scored.append((job, fast))

        # Step 2: Sort and run Claude on top-N
        scored.sort(key=lambda x: x[1], reverse=True)

        final_scores: Dict[str, Tuple[int, Dict]] = {}

        claude_tasks = [
            cls.score_full(seeker, job)
            for job, _ in scored[:CLAUDE_TOP_N]
        ]
        if claude_tasks:
            claude_results = await asyncio.gather(*claude_tasks, return_exceptions=True)
            for i, (job, fast) in enumerate(scored[:CLAUDE_TOP_N]):
                result = claude_results[i]
                if isinstance(result, Exception):
                    final_scores[str(job["_id"])] = (fast, {})
                else:
                    final_scores[str(job["_id"])] = result

        # Step 3: Upsert all scores
        count = 0
        for job, fast in scored:
            jid_str = str(job["_id"])
            score, detail = final_scores.get(jid_str, (fast, {}))

            await db.job_matches.update_one(
                {"seeker_id": sid, "job_id": job["_id"]},
                {"$set": {
                    "seeker_id":   sid,
                    "job_id":      job["_id"],
                    "score":       score,
                    "claude_detail": detail,
                    "updated_at":  datetime.utcnow(),
                }},
                upsert=True,
            )
            count += 1

        logger.info("Stored %d matches for seeker %s", count, seeker_id)
        return count

    @classmethod
    async def compute_and_store_matches_for_job(cls, db, job_id: str) -> int:
        """
        Score ALL seekers vs ONE job.
        Fast scores for all, Claude for top-N.
        Patches match_score on existing applications too.
        Call after: employer posts or edits a job.
        """
        jid = ObjectId(job_id)
        job = await db.job_postings.find_one({"_id": jid})
        if not job:
            raise ValueError("Job not found")

        # Step 1: Fast-score all seekers
        scored: List[Tuple[Any, int]] = []
        async for seeker in db.users.find({"role": "seeker"}):
            fast = cls.score_fast(seeker, job)
            scored.append((seeker, fast))

        # Step 2: Claude on top-N seekers
        scored.sort(key=lambda x: x[1], reverse=True)

        final_scores: Dict[str, Tuple[int, Dict]] = {}
        claude_tasks = [
            cls.score_full(seeker, job)
            for seeker, _ in scored[:CLAUDE_TOP_N]
        ]
        if claude_tasks:
            claude_results = await asyncio.gather(*claude_tasks, return_exceptions=True)
            for i, (seeker, fast) in enumerate(scored[:CLAUDE_TOP_N]):
                result = claude_results[i]
                if isinstance(result, Exception):
                    final_scores[str(seeker["_id"])] = (fast, {})
                else:
                    final_scores[str(seeker["_id"])] = result

        # Step 3: Upsert + patch applications
        count = 0
        for seeker, fast in scored:
            sid_str = str(seeker["_id"])
            score, detail = final_scores.get(sid_str, (fast, {}))

            await db.job_matches.update_one(
                {"seeker_id": seeker["_id"], "job_id": jid},
                {"$set": {
                    "seeker_id":     seeker["_id"],
                    "job_id":        jid,
                    "score":         score,
                    "claude_detail": detail,
                    "updated_at":    datetime.utcnow(),
                }},
                upsert=True,
            )
            await db.applications.update_many(
                {"seeker_id": seeker["_id"], "job_id": jid},
                {"$set": {"match_score": score}},
            )
            count += 1

        logger.info("Stored %d matches for job %s", count, job_id)
        return count

    @classmethod
    async def score_and_patch_application(cls, db, application_id: str) -> int:
        """
        Full 3-layer score for ONE application. Patches match_score immediately.
        Call right after a seeker submits an application.
        Returns the final score.
        """
        aid = ObjectId(application_id)
        app = await db.applications.find_one({"_id": aid})
        if not app:
            raise ValueError("Application not found")

        seeker = await db.users.find_one({"_id": app["seeker_id"]})
        job    = await db.job_postings.find_one({"_id": app["job_id"]})
        if not seeker or not job:
            return 0

        score, detail = await cls.score_full(seeker, job)

        await db.applications.update_one(
            {"_id": aid},
            {"$set": {"match_score": score, "match_detail": detail}},
        )
        await db.job_matches.update_one(
            {"seeker_id": app["seeker_id"], "job_id": app["job_id"]},
            {"$set": {
                "seeker_id":     app["seeker_id"],
                "job_id":        app["job_id"],
                "score":         score,
                "claude_detail": detail,
                "updated_at":    datetime.utcnow(),
            }},
            upsert=True,
        )

        logger.info("Patched application %s → match_score=%d", application_id, score)
        return score
