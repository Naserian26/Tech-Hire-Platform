import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.getcwd())

from app.config import get_settings

async def seed():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.techhire
    
    count = await db.job_postings.count_documents({})
    print(f"Current job count: {count}")
    
    if count == 0:
        print("Seeding mock jobs...")
        mock_jobs = [
            {
                "title": "Senior React Developer",
                "company_name": "TechHire Solutions",
                "location": "Remote",
                "salary_min": 120000,
                "salary_max": 150000,
                "type": "Full-Time",
                "description": "<p>We are looking for a Senior React Developer...</p>",
                "match": 98
            },
            {
                "title": "Backend Python Engineer",
                "company_name": "DataFlow Systems",
                "location": "Stockholm, SE",
                "salary_min": 100000,
                "salary_max": 130000,
                "type": "Full-Time",
                "description": "<p>Join our backend team...</p>",
                "match": 92
            },
            {
                "title": "UI/UX Designer",
                "company_name": "Creative Agency",
                "location": "London, UK",
                "salary_min": 80000,
                "salary_max": 110000,
                "type": "Contract",
                "description": "<p>Help us design the future...</p>",
                "match": 85
            }
        ]
        await db.job_postings.insert_many(mock_jobs)
        print("Mock jobs seeded successfully.")
    else:
        print("Jobs already exist in the database.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
