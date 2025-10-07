import uuid
import traceback
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from pydantic import BaseModel
from prisma import Prisma
from main import get_prisma_client
from typing import List, Optional
import asyncio
from datetime import datetime, timezone, timedelta
import os
import time
import shutil
from fastapi.responses import JSONResponse
from collections import defaultdict
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, Form, UploadFile, File, Query
import csv
import re
from prisma import Prisma
from modules.groq_client import generate_personalized_message, generate_quiz_from_transcription
from modules.openai_client import generate_personalized_message_openai
from routes.auth import get_current_user
from modules.aisensy_client import send_whatsapp_message
from modules.db_connector import DBConnection
from supabase import create_client, Client
import httpx
import json

# Supabase Initialization
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

class LinkedInCookie(BaseModel):
    linkedinCookie: str

@router.post("/build-in-public/fetch-linkedin-posts")
async def fetch_linkedin_posts(linkedin_cookie_data: LinkedInCookie, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can fetch LinkedIn posts")

    try:
        # Fetch all users with a linkedinUsername from the database
        users = await prisma.user.find_many(
            where={
                "linkedinUsername": {
                    "not": None,
                },
            },
        )

        urls = [
            f"https://www.linkedin.com/in/{user.linkedinUsername}/recent-activity/all/"
            for user in users
            if user.linkedinUsername
        ]

        if not urls:
            return {"message": "No LinkedIn usernames found to fetch posts for.", "data": []}

        apify_request_body = {
            "cookie": json.loads(linkedin_cookie_data.linkedinCookie), # Assuming linkedinCookie is a JSON string of the cookie array
            "deepScrape": True,
            "maxDelay": 8,
            "minDelay": 2,
            "proxy": {
                "useApifyProxy": True,
                "apifyProxyCountry": "US",
            },
            "rawData": False,
            "urls": urls,
            # "limitPerSource": 2,
        }

        apify_api_token = os.environ.get("APIFY_API_TOKEN")
        apify_api_url = f"https://api.apify.com/v2/acts/curious_coder~linkedin-post-search-scraper/run-sync-get-dataset-items?token={apify_api_token}"

        async with httpx.AsyncClient(timeout=21600.0) as client:
            apify_response = await client.post(apify_api_url, json=apify_request_body)
            apify_response.raise_for_status()

        apify_data = apify_response.json()

        # Process and store the fetched LinkedIn posts in your database
        for post in apify_data:
            # Check if the post has a 'text' field and contains the required keywords
            if "text" in post and post["text"] is not None:
                post_text_lower = post["text"].lower()
                if re.search(r'\b(#100xengineers|100xengineers|#0to100xengineers|#0to100xengineer|#0to100xEngineer|#0to100xEngineers)', post_text_lower, re.IGNORECASE):
                    linkedin_username = None
                    if "inputUrl" in post and post["inputUrl"]:
                        parts = post["inputUrl"].split("/in/")
                        if len(parts) > 1:
                            linkedin_username = parts[1].split("/")[0]

                    if linkedin_username:
                        user_id = next((user.id for user in users if user.linkedinUsername == linkedin_username), None)

                        if user_id:
                            await prisma.post.upsert(
                                where={
                                    "url": post["url"]
                                },
                                data={
                                    "create": {
                                        "userId": user_id,
                                        "url": post["url"],
                                        "platform": "LINKEDIN",
                                        "numLikes": post.get("numLikes", 0),
                                        "numComments": post.get("numComments", 0),
                                        "postedAt": datetime.fromisoformat(post["postedAtISO"].replace("Z", "+00:00")) if "postedAtISO" in post else datetime.now(timezone.utc),
                                    },
                                    "update": {
                                        "numLikes": post.get("numLikes", 0),
                                        "numComments": post.get("numComments", 0),
                                        "postedAt": datetime.fromisoformat(post["postedAtISO"].replace("Z", "+00:00")) if "postedAtISO" in post else datetime.now(timezone.utc),
                                    },
                                }
                            )

        return {"message": "LinkedIn posts fetched successfully!", "data": apify_data}

    except httpx.HTTPStatusError as e:
        print(f"Apify API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Apify API error: {e.response.text}")
    except httpx.RequestError as e:
        print(f"HTTPX request error: {e}")
        raise HTTPException(status_code=500, detail=f"Network or request error: {e}")
    except json.JSONDecodeError:
        print("JSON decoding error: Invalid LinkedIn cookie format or Apify response.")
        raise HTTPException(status_code=400, detail="Invalid LinkedIn cookie format or Apify response. Must be a JSON string.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/build-in-public/fetch-linkedin-posts-sequentially")
async def fetch_linkedin_posts_sequentially(linkedin_cookie_data: LinkedInCookie, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can fetch LinkedIn posts sequentially")

    async def keep_alive_task():
        while True:
            try:
                async with httpx.AsyncClient() as client:
                    await client.get("https://one00x-be.onrender.com/api/cohorts")
                print("Keep-alive API called successfully.")
            except httpx.RequestError as e:
                print(f"Keep-alive API call failed: {e}")
            await asyncio.sleep(120) # Call every 2 minutes

    # Start the keep-alive task in the background
    keep_alive_handle = asyncio.create_task(keep_alive_task())

    try:
        users = await prisma.user.find_many(
            where={
                "linkedinUsername": {
                    "not": None,
                },
            },
        )

        if not users:
            keep_alive_handle.cancel() # Cancel the task if no users
            return {"message": "No LinkedIn usernames found to fetch posts for.", "data": []}

        all_apify_data = []

        for user in users:
            if user.linkedinUsername:
                url = f"https://www.linkedin.com/in/{user.linkedinUsername}/recent-activity/all/"
                urls = [url] # Process one URL at a time

                apify_request_body = {
                    "cookie": json.loads(linkedin_cookie_data.linkedinCookie),
                    "deepScrape": True,
                    "maxDelay": 8,
                    "minDelay": 2,
                    "proxy": {
                        "useApifyProxy": True,
                        "apifyProxyCountry": "US",
                    },
                    "rawData": False,
                    "urls": urls,
                    "limitPerSource" : 120
                }

                apify_api_token = os.environ.get("APIFY_API_TOKEN")
                apify_api_url = f"https://api.apify.com/v2/acts/curious_coder~linkedin-post-search-scraper/run-sync-get-dataset-items?token={apify_api_token}"

                async with httpx.AsyncClient(timeout=3600.0) as client:
                    apify_response = await client.post(apify_api_url, json=apify_request_body)
                    apify_response.raise_for_status()

                apify_data = apify_response.json()
                all_apify_data.extend(apify_data)

                # Process and store the fetched LinkedIn posts in your database
                for post in apify_data:
                    if "text" in post and post["text"] is not None:
                        post_text_lower = post["text"].lower()
                        if re.search(r'\b(0to100xengineers|0to100xengineer|0to100xEngineers|0to100xEngineer|100xengineer|100xengineers|100xEngineers|#100xengineers|#0to100xengineers|#0to100xengineer|#0to100xEngineers|#0to100xEngineer)', post_text_lower, re.IGNORECASE):
                            linkedin_username = None
                            if "inputUrl" in post and post["inputUrl"]:
                                parts = post["inputUrl"].split("/in/")
                                if len(parts) > 1:
                                    linkedin_username = parts[1].split("/")[0]

                            if linkedin_username:
                                user_id = next((u.id for u in users if u.linkedinUsername == linkedin_username), None)

                                if user_id:
                                    await prisma.post.upsert(
                                        where={
                                            "url": post["url"]
                                        },
                                        data={
                                            "create": {
                                                "userId": user_id,
                                                "url": post["url"],
                                                "platform": "LINKEDIN",
                                                "numLikes": post.get("numLikes", 0),
                                                "numComments": post.get("numComments", 0),
                                                "postedAt": datetime.fromisoformat(post["postedAtISO"].replace("Z", "+00:00")) if "postedAtISO" in post else datetime.now(timezone.utc),
                                            },
                                            "update": {
                                                "numLikes": post.get("numLikes", 0),
                                                "numComments": post.get("numComments", 0),
                                                "postedAt": datetime.fromisoformat(post["postedAtISO"].replace("Z", "+00:00")) if "postedAtISO" in post else datetime.now(timezone.utc),
                                            },
                                        }
                                    )

        keep_alive_handle.cancel() # Cancel the task when processing is complete
        return {"message": "LinkedIn posts fetched and processed sequentially!", "data": all_apify_data}

    except httpx.HTTPStatusError as e:
        keep_alive_handle.cancel() # Cancel the task on error
        print(f"Apify API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Apify API error: {e.response.text}")
    except httpx.RequestError as e:
        keep_alive_handle.cancel() # Cancel the task on error
        print(f"HTTPX request error: {e}")
        raise HTTPException(status_code=500, detail=f"Network or request error: {e}")
    except json.JSONDecodeError:
        keep_alive_handle.cancel() # Cancel the task on error
        print("JSON decoding error: Invalid LinkedIn cookie format or Apify response.")
        raise HTTPException(status_code=400, detail="Invalid LinkedIn cookie format or Apify response. Must be a JSON string.")
    except Exception as e:
        keep_alive_handle.cancel() # Cancel the task on error
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


class ResourceCreate(BaseModel):
    cohortId: str
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]
    weekNumber: int
    isOptional: Optional[bool] = False

class OptionCreate(BaseModel):
    optionText: str
    isCorrect: bool

class QuestionCreate(BaseModel):
    questionText: str
    questionType: str
    options: List[OptionCreate]

class QuizCreate(BaseModel):
    cohortId: str
    weekNumber: int
    questions: List[QuestionCreate]

class GenerateQuizAI(BaseModel):
    cohortId: str
    weekNumber: int
    transcription: str

@router.post("/quizzes")
async def create_quiz(quiz_data: QuizCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create quizzes")

    new_quiz = await prisma.quiz.create(
        data={

            "weekNumber": quiz_data.weekNumber,
            "questions": {
                "create": [
                    {
                        "questionText": q.questionText,
                        "questionType": q.questionType,
                        "options": {
                            "create": [
                                {
                                    "optionText": opt.optionText,
                                    "isCorrect": opt.isCorrect
                                } for opt in q.options
                            ]
                        }
                    } for q in quiz_data.questions
                ]
            },
            "tasks": {
                "create": {
                    "status": "PENDING",
                    "assignedDate": datetime.now(timezone.utc)
                }
            }
        },
        include={
            "questions": {
                "include": {
                    "options": True
                }
            },
            "tasks": True
        }
    )

    return {
        "success": True,
        "data": new_quiz,
        "message": "Quiz created successfully"
    }

@router.post("/quizzes/generate-ai")
async def generate_quiz_ai(quiz_ai_data: GenerateQuizAI, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can generate quizzes using AI")

    try:
        generated_quiz_content_str = await generate_quiz_from_transcription(quiz_ai_data.transcription)
        import json
        try:
            generated_quiz_content = json.loads(generated_quiz_content_str)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse Groq API response as JSON: {e}. Raw response: {generated_quiz_content_str}")

        # Assuming generated_quiz_content is a dictionary with a 'questions' key
        # We need to convert the generated questions into the QuestionCreate format
        questions_for_db = []
        for q_data in generated_quiz_content.get('questions', []):
            options_for_db = []
            for o_data in q_data.get('options', []):
                options_for_db.append(OptionCreate(optionText=o_data['optionText'], isCorrect=o_data['isCorrect']))
            questions_for_db.append(QuestionCreate(questionText=q_data['questionText'], questionType=q_data['questionType'], options=options_for_db))

        # Create the quiz in the database
        new_quiz = await prisma.quiz.create(
            data={
                "cohortId": quiz_ai_data.cohortId,
                "weekNumber": quiz_ai_data.weekNumber,
                "questions": {
                    "create": [
                        {
                            "questionText": q.questionText,
                            "questionType": q.questionType,
                            "options": {
                                "create": [
                                    {
                                        "optionText": opt.optionText,
                                        "isCorrect": opt.isCorrect
                                    } for opt in q.options
                                ]
                            }
                        } for q in questions_for_db
                    ]
                },

            },
            include={
                "questions": {
                    "include": {
                        "options": True
                    }
                },
                "tasks": True
            }
        )

        return {
            "success": True,
            "data": new_quiz,
            "message": "Quiz generated successfully using AI"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz using AI: {e}")

class OptionUpdate(BaseModel):
    id: Optional[str] = None
    optionText: str
    isCorrect: bool

class QuestionUpdate(BaseModel):
    id: Optional[str] = None
    questionText: str
    questionType: str
    options: List[OptionUpdate]

class QuizUpdate(BaseModel):
    questions: List[QuestionUpdate]

class CohortCreate(BaseModel):
    name: str
    totalWeeks: int

class SessionCreate(BaseModel):
    title: str
    description: str
    weekNumber: int
    lectureNumber: int
    cohortId: str
    imageUrl: Optional[str] = None
    sessionType: Optional[str] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weekNumber: Optional[int] = None
    lectureNumber: Optional[int] = None
    imageUrl: Optional[str] = None
    sessionType: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    description: str
    weekNumber: int
    lectureNumber: int
    cohortId: str
    imageUrl: Optional[str] = None
    sessionType: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class CreateSessionResponse(BaseModel):
    success: bool
    data: SessionResponse
    message: str



class WeeklyResourcePayload(BaseModel):
    id: Optional[str] = None
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]
    isOptional: Optional[bool] = False
    quizId: Optional[str] = None

@router.post("/cohorts/{cohort_id}/sessions", response_model=CreateSessionResponse)
async def create_session(
    cohort_id: str,
    title: str = Form(...),
    description: str = Form(...),
    weekNumber: int = Form(...),
    lectureNumber: int = Form(...),
    image: UploadFile = File(None),
    sessionType: Optional[str] = Form(None),
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client)
):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create sessions")

    existing_session = await prisma.session.find_first(
        where={
            "cohortId": cohort_id,
            "weekNumber": weekNumber,
            "lectureNumber": lectureNumber,
        }
    )

    if existing_session:
        # Resend notifications
        notifications = await prisma.notification.find_many(
            where={
                "sessionId": existing_session.id
            }
        )
        for notification in notifications:
            asyncio.create_task(_resend_notification_in_background(notification, prisma))
        
        return {
            "success": True,
            "data": SessionResponse(
                id=existing_session.id,
                title=existing_session.title,
                description=existing_session.description,
                weekNumber=existing_session.weekNumber,
                lectureNumber=existing_session.lectureNumber,
                cohortId=existing_session.cohortId,
                imageUrl=existing_session.imageUrl,
                createdAt=existing_session.createdAt,
                updatedAt=existing_session.updatedAt
            ),
            "message": "Session already exists, notifications resent."
        }

    image_url = None
    if image:
        try:
            file_content = await image.read()
            file_name = f"{uuid.uuid4()}-{image.filename}"
            response = supabase.storage.from_("test").upload(file_name, file_content, {"content-type": image.content_type})
            image_url = supabase.storage.from_("test").get_public_url(file_name)
           
            # Construct the public URL
            # image_url = f"{SUPABASE_URL}/storage/v1/object/public/test/{file_name}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image to Supabase: {e}")

    new_session = await prisma.session.create(
        data={
            "cohortId": cohort_id,
            "title": title,
            "description": description,
            "weekNumber": weekNumber,
            "lectureNumber": lectureNumber,
            "sessionType": sessionType,
            "imageUrl": image_url
        }
    )

    # Asynchronously send notification for new session
    user_where_clause = {
        "launchpad": {
            "isNot": None
        },
        "cohortId": cohort_id,
    }

    if sessionType and sessionType != "combined":
        user_where_clause["type"] = sessionType

    users_with_launchpad = await prisma.user.find_many(
        where=user_where_clause,
        include={
            "launchpad": True
        }
    )

    for user in users_with_launchpad:
        try:
            context = {
                "student_background": user.launchpad.studyStream if user.launchpad and user.launchpad.studyStream else "",
                "student_interests": user.launchpad.codingFamiliarity if user.launchpad and user.launchpad.codingFamiliarity else "",
                "student_future_goals": user.launchpad.expectedOutcomes if user.launchpad and user.launchpad.expectedOutcomes else "",
                "upcoming_session_title": new_session.title,
                "upcoming_session_description": new_session.description
            }
            # personalized_message = await generate_personalized_message(context)
            personalized_message = await generate_personalized_message_openai(context)
            await prisma.notification.create(
                data={
                    "studentId": user.id,
                    "sessionId": new_session.id,
                    "message": f"Pointer 1: {personalized_message['pointer1']}\nPointer 2: {personalized_message['pointer2']}",
                    "status": "generated"
                }
            )
            print(f"Notification generated and saved for user {user.id}")
            time.sleep(1.2) # Delay for 0.6 seconds to limit to 100 notifications per minute
        except Exception as e:
            print(f"Failed to generate or save notification for user {user.id}: {e}")

    return {
        "success": True,
        "data": SessionResponse.model_validate(new_session.model_dump()),
        "message": "Session created successfully and notification initiated"
    }

@router.post("/resources")
async def create_resource(resource: ResourceCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)): 
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create resources")
    
    new_resource = await prisma.resource.create(
        data={
            "cohortId": resource.cohortId,
            "title": resource.title,
            "url": resource.url,
            "type": resource.type,
            "duration": resource.duration,
            "tags": resource.tags,
            "isOptional": resource.isOptional,
            "weekNumber": resource.weekNumber,
            "isOptional": resource.isOptional
        }
    )
    
    return {
        "success": True,
        "data": new_resource,
        "message": "Resource created successfully"
    }

@router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can view quizzes")

    quiz = await prisma.quiz.find_unique(
        where={
            "id": quiz_id
        },
        include={
            "questions": {
                "include": {
                    "options": True
                }
            }
        }
    )

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return {
        "success": True,
        "data": quiz,
        "message": "Quiz retrieved successfully"
    }

@router.get("/quizzes")
async def get_all_quizzes(cohortId: Optional[str] = None, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can view quizzes")

    where_clause = {}
    if cohortId:
        where_clause["cohortId"] = cohortId

    quizzes = await prisma.quiz.find_many(
        where=where_clause,
        include={
            "questions": {
                "include": {
                    "options": True
                }
            }
        }
    )

    return {
        "success": True,
        "data": quizzes,
        "message": "Quizzes retrieved successfully"
    }

@router.get("/cohorts/{cohort_id}/weeks/{week_number}/resources")
async def get_resources_by_week(
    cohort_id: str,
    week_number: int,
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client)
):
    try:
        if current_user.role not in ["INSTRUCTOR", "LEARNER"]:
            raise HTTPException(status_code=403, detail="Not authorized to view resources")

        resources = await prisma.resource.find_many(
            where={
                "cohortId": cohort_id,
                "weekNumber": week_number
            }
        )

        # Convert Prisma resources to WeeklyResourcePayload format
        formatted_resources = [
            WeeklyResourcePayload(
                id=str(res.id),
                title=res.title,
                url=res.url,
                type=res.type,
                duration=res.duration,
                tags=res.tags,
                isOptional=res.isOptional
            ) for res in resources
        ]

        return {
            "success": True,
            "data": formatted_resources,
            "message": f"Resources for cohort {cohort_id}, week {week_number} retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

@router.get("/cohorts")
async def get_cohorts(prisma: Prisma = Depends(get_prisma_client)):
    cohorts = await prisma.cohort.find_many()
    
    return {
        "success": True,
        "data": cohorts,
        "message": "Cohorts retrieved successfully"
    }

@router.put("/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, quiz_data: QuizUpdate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can update quizzes")

    existing_quiz = await prisma.quiz.find_unique(where={"id": quiz_id})
    if not existing_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Update questions and options
    for q_data in quiz_data.questions:
        if q_data.id:
            # Update existing question
            await prisma.question.update(
                where={"id": q_data.id},
                data={
                    "questionText": q_data.questionText,
                    "questionType": q_data.questionType,
                }
            )
            for opt_data in q_data.options:
                if opt_data.id:
                    # Update existing option
                    await prisma.option.update(
                        where={"id": opt_data.id},
                        data={
                            "optionText": opt_data.optionText,
                            "isCorrect": opt_data.isCorrect
                        }
                    )
                else:
                    # Create new option for existing question
                    await prisma.option.create(
                        data={
                            "questionId": q_data.id,
                            "text": opt_data.optionText,
                            "isCorrect": opt_data.isCorrect
                        }
                    )
        else:
            # Create new question for the quiz
            new_question = await prisma.question.create(
                data={
                    "quizId": quiz_id,
                    "questionText": q_data.questionText,
                    "questionType": q_data.questionType,
                    "options": {
                        "create": [
                            {
                                "optionText": opt.optionText,
                                "isCorrect": opt.isCorrect
                            } for opt in q_data.options
                        ]
                    }
                }
            )

    updated_quiz = await prisma.quiz.find_unique(
        where={"id": quiz_id},
        include={
            "questions": {
                "include": {
                    "options": True
                }
            }
        }
    )

    return {
        "success": True,
        "data": updated_quiz,
        "message": "Quiz updated successfully"
    }

@router.post("/cohorts")
async def create_cohort(cohort_name: str = Form(...), total_weeks: int = Form(...), csv_file: UploadFile = File(...), current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create cohorts")
    
    # Calculate start and end dates
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(weeks=total_weeks)

    new_cohort = await prisma.cohort.create(
        data={
            "name": cohort_name,
            "totalWeeks": total_weeks,
            "startDate": start_date,
            "endDate": end_date
        }
    )

    # Process the CSV file
    try:
        csv_content = await csv_file.read()
        db_connection = DBConnection()
        await db_connection.connect()

        if not db_connection.connected:
            raise HTTPException(status_code=500, detail="Failed to connect to database for CSV processing.")

        csv_reader = csv.reader(csv_content.decode('utf-8').splitlines())
        header = [h.strip() for h in next(csv_reader)] # Read and strip header row

        for row_values in csv_reader:
            row_data = dict(zip(header, row_values))
            # Map CSV columns to expected keys by insert_user_from_row
            mapped_row_data = {
                "Email": row_data.get("Email"),
                "Name": row_data.get("Name"),
                "Phone Number": row_data.get("Phone Number") if row_data.get("Phone Number") else None,
                "Type" : row_data.get("Type"),
                "Student": row_data.get("Student"),
                "Work Experience": row_data.get("Work Experience"),
                "Study Stream": row_data.get("Study Stream"),
                "Expected Outcomes": row_data.get("Expected Outcomes"),
                "Coding Familiarity": row_data.get("Coding Familiarity"),
                "Python Familiarity": row_data.get("Python Familiarity"),
                "Linkedin URLs" : row_data.get("Linkedin URLs"),
                "Languages": row_data.get("Languages"),
                "Years of Experience": row_data.get("Years of Experience")
            }
            result = await db_connection.insert_user_from_row(mapped_row_data, cohort_id=new_cohort.id)
            if result["status"] == "failure":
                print(f"Failed to insert user {result.get('email')}: {result.get('error')}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {e}")
    
    return {
        "success": True,
        "data": new_cohort,
        "message": "Cohort created successfully"
    }

@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can delete quizzes")

    existing_quiz = await prisma.quiz.find_unique(where={"id": quiz_id})
    if not existing_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    await prisma.quiz.delete(where={"id": quiz_id})

    return {
        "success": True,
        "message": "Quiz deleted successfully"
    }

@router.get("/resources/all_by_cohort/{cohort_id}")
async def get_all_resources_for_cohort(cohort_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role not in ["INSTRUCTOR", "LEARNER"]:
        raise HTTPException(status_code=403, detail="Only instructors and learners can view all resources for a cohort")
    
    resources = await prisma.resource.find_many(
        where={
            "cohortId": cohort_id
        }
    )

    quizzes = await prisma.quiz.find_many(
        where={
            "cohortId": cohort_id
        }
    )
    
    # Group resources and quizzes by week number
    weekly_items = {}

    for resource in resources:
        if resource.weekNumber not in weekly_items:
            weekly_items[resource.weekNumber] = []
        weekly_items[resource.weekNumber].append({
            "id": resource.id,
            "title": resource.title,
            "type": resource.type,
            "url": resource.url,
            "duration": resource.duration,
            "tags": resource.tags,
            "isOptional": resource.isOptional
        })

    for quiz in quizzes:
        if quiz.weekNumber not in weekly_items:
            weekly_items[quiz.weekNumber] = []
        weekly_items[quiz.weekNumber].append({
            "id": quiz.id,
            "title": f"Quiz for Week {quiz.weekNumber}", # Placeholder title
            "type": "QUIZ",
            "url": f"/quizzes/{quiz.id}", # Placeholder URL
            "duration": 0, # Quizzes don't have a duration
            "tags": [],
            "isOptional": False, # Quizzes are generally not optional
       
        })
    
    # Convert to list of WeekResource objects, sorted by week number
    result = [
        {"week": week, "resources": weekly_items[week]}
        for week in sorted(weekly_items.keys())
    ]
    
    return {
        "success": True,
        "data": result,
        "message": "All resources for cohort retrieved successfully"
    }

@router.get("/resources/{cohort_id}/{week_number}")
async def get_resources(cohort_id: str, week_number: int, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    # Existing function to get resources for a specific week
    resources = await prisma.resource.find_many(
        where={
            "cohortId": cohort_id,
            "weekNumber": week_number
        }
    )
    
    return {
        "success": True,
        "data": resources,
        "message": "Resources retrieved successfully"
    }

@router.post("/resources/{cohort_id}/{week_number}")
async def create_weekly_resource(cohort_id: str, week_number: int, resources: List[WeeklyResourcePayload] = Body(...), current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    print(f"Received resources for week {week_number}: {resources}")
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create resources")
    
    # Verify the cohort exists
    cohort = await prisma.cohort.find_unique(where={"id": cohort_id})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Get all plans for this cohort that have tasks for this week
    # We need to fetch plans first, because deleting resources will cascade delete tasks
    plans_to_update = await prisma.plan.find_many(
        where={
            "cohortId": cohort_id,
            "tasks": {
                "some": {
                    "resource": {
                        "weekNumber": week_number
                    }
                }
            }
        },
        include={
            "tasks": {
                "where": {
                    "resource": {
                        "weekNumber": week_number
                    }
                }
            }
        }
    )

    # Delete existing resources for this week and cohort
    # This will cascade delete associated tasks due to onDelete: Cascade
    await prisma.resource.delete_many(
        where={
            "cohortId": cohort_id,
            "weekNumber": week_number
        }
    )

    # Create new resources and quizzes
    created_items = []
    for item in resources:
        if item.type == "QUIZ":
            if not item.quizId:
                raise HTTPException(status_code=400, detail="quizId is required for QUIZ type resources")
            
            # Verify quiz exists
            quiz = await prisma.quiz.find_unique(where={"id": item.quizId})
            if not quiz:
                raise HTTPException(status_code=404, detail=f"Quiz with ID {item.quizId} not found")
            
            # Create a dummy resource entry for the quiz to link it
            new_quiz_resource = await prisma.resource.create(
                data={
                    "cohortId": cohort_id,
                    "title": item.title or f"Quiz for Week {week_number}",
                    "url": item.url or f"/quizzes/{item.quizId}",
                    "type": "QUIZ",
                    "duration": 0,
                    "tags": item.tags or [],
                    "weekNumber": week_number,
                    "isOptional": item.isOptional,
                    "quizId": item.quizId # Link the quiz
                }
            )
            created_items.append(new_quiz_resource)
        else:
            new_resource = await prisma.resource.create(
                data={
                    "cohortId": cohort_id,
                    "title": item.title,
                    "url": item.url,
                    "type": item.type,
                    "duration": item.duration,
                    "tags": item.tags,
                    "weekNumber": week_number,
                    "isOptional": item.isOptional,
                }
            )
            created_items.append(new_resource)

    # Re-create tasks for existing plans
    for plan in plans_to_update:
        # Delete existing tasks for this week and plan
        await prisma.task.delete_many(
            where={
                "planId": plan.id,
                "resource": {
                    "weekNumber": week_number
                }
            }
        )
        # Re-create tasks for the updated resources
        for resource_item in created_items:
            await prisma.task.create(
                data={
                    "planId": plan.id,
                    "resourceId": resource_item.id,
                    "status": "NOT_STARTED"
                }
            )

    return {
        "success": True,
        "data": created_items,
        "message": "Weekly resources created/updated successfully"
    }



    # In a real application, you might save session details to a database
    # or trigger an external service call here.

    # Fetch all users with their launchpad data
    users_with_launchpad = await prisma.user.find_many(
        where={
            "launchpad": {
                "isNot": None  # Only users who have filled out the launchpad
            }
        },
        include={
            "launchpad": True
        }
    )

async def _send_notifications_in_background(user, session_details, prisma: Prisma):
    print('Entered')
    media = None  # Initialize media to None
    if user.launchpad:
        context = {
            "student_background": {
                "education": user.launchpad.studyStream,
                "experience": user.launchpad.workExperience,
                "current_role": user.launchpad.yearsOfExperience
            },
            "student_interests": {
                "coding_familiarity": user.launchpad.codingFamiliarity,
                "python_familiarity": user.launchpad.pythonFamiliarity,
                "languages": user.launchpad.languages
            },
            "student_future_goals": user.launchpad.expectedOutcomes,
            "upcoming_session_title": session_details.title,
            "upcoming_session_description": session_details.description
        }

        # Call Groq API to generate message
        # personalized_message_pointers = await generate_personalized_message(context)
        personalized_message_pointers = await generate_personalized_message_openai(context)

        # Calculate remaining time and status
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        session_time_ist = datetime.now(ist).replace(hour=18, minute=0, second=0, microsecond=0)

        remaining_time_delta = session_time_ist - now_ist
        remaining_minutes = int(remaining_time_delta.total_seconds() / 60)

        if remaining_minutes > 0:
            status = f"Starting in {remaining_minutes} minutes"
        else:
            status = "Started"

        if user.phoneNumber:
            print(f"Attempting to send WhatsApp message to {user.phoneNumber} for session {session_details.id}")
            if session_details.imageUrl:
                media = {
                    "url": session_details.imageUrl,
                    "filename": "session_image.jpg"
                }
            await send_whatsapp_message(
                destination=user.phoneNumber,
                user_name=user.name,
                message_body_1=personalized_message_pointers["pointer1"],
                message_body_2=personalized_message_pointers["pointer2"],
                session_title=session_details.title,
                remaining_time="06:00 PM IST",
                status=status,
                media=media
            )
        
        await prisma.notification.create(
            data={
                "studentId": user.id,
                "sessionId": session_details.id,
                "message": f"Pointer 1: {personalized_message_pointers['pointer1']}\nPointer 2: {personalized_message_pointers['pointer2']}",
                "status": "SENT",
            }
        )

@router.get("/cohorts/{cohort_id}/sessions")
async def get_sessions(
    cohort_id: str,
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client)
):
    if current_user.role not in ["INSTRUCTOR", "LEARNER"]:
        raise HTTPException(status_code=403, detail="Only instructors and learners can view sessions")

    sessions = await prisma.session.find_many(
        where={
            "cohortId": cohort_id
        }
    )
    return {
        "success": True,
        "data": [SessionResponse.model_validate(session.model_dump()) for session in sessions],
        "message": "Sessions retrieved successfully"
    }

@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    title: str = Form(...),
    description: str = Form(...),
    weekNumber: int = Form(...),
    lectureNumber: int = Form(...),
    image: UploadFile = File(None),
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
    sessionType: Optional[str] = None
):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can update sessions")

    image_url = None
    if image:
        file_path = f"uploads/{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/{file_path}"

    existing_session = await prisma.session.find_unique(where={"id": session_id})
    if not existing_session:
        raise HTTPException(status_code=404, detail="Session not found")

    updated_session = await prisma.session.update(
        where={"id": session_id},
        data={
            "title": title,
            "description": description,
            "weekNumber": weekNumber,
            "sessionType" : sessionType,
            "lectureNumber": lectureNumber,
            "imageUrl": image_url if image_url else existing_session.imageUrl # Keep existing image if no new one is uploaded
        }
    )

    # Asynchronously send notification for updated session
    users_with_launchpad = await prisma.user.find_many(
        where={
            "launchpad": {
                "isNot": None  # Only users who have filled out the launchpad
            },
            "type": sessionType
        },
        include={
            "launchpad": True
        }
    )
    
    return {
        "success": True,
        "data": SessionResponse.model_validate(updated_session.model_dump()),
        "message": "Session updated successfully and notification initiated"
    }

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client)
):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can delete sessions")

    existing_session = await prisma.session.find_unique(where={"id": session_id})
    if not existing_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete associated notifications first
    await prisma.notification.delete_many(
        where={
            "sessionId": session_id
        }
    )

    await prisma.session.delete(where={"id": session_id})
    return {
        "success": True,
        "message": "Session and associated notifications deleted successfully"
    }


@router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can delete resources")
    
    existing_resource = await prisma.resource.find_unique(where={"id": resource_id})
    if not existing_resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    await prisma.resource.delete(where={"id": resource_id})
    
    return {
        "success": True,
        "message": "Resource deleted successfully"
    }

@router.delete("/resources/{cohort_id}/{week_number}")
async def delete_week_resources(cohort_id: str, week_number: int, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can delete resources")
    
    # Verify the cohort exists
    cohort = await prisma.cohort.find_unique(where={"id": cohort_id})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Delete all resources for this week and cohort
    deleted_count = await prisma.resource.delete_many(
        where={
            "cohortId": cohort_id,
            "weekNumber": week_number
        }
    )
    
    return {
        "success": True,
        "message": f"Successfully deleted {deleted_count} resources for week {week_number}"
    }

@router.get("/dashboard/{cohort_id}")
async def get_cohort_dashboard(cohort_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can access dashboard")
    
    # Get cohort details
    cohort = await prisma.cohort.find_unique(
        where={"id": cohort_id},
        include={
            "plans": {
                "include": {
                    "user": True,
                    "tasks": True
                }
            },
            "resources": True
        }
    )
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Calculate metrics
    total_learners = len(set(plan.userId for plan in cohort.plans))
    total_resources = len(cohort.resources)
    total_tasks = sum(len(plan.tasks) for plan in cohort.plans)
    completed_tasks = sum(
        sum(1 for task in plan.tasks if task.status == "COMPLETED")
        for plan in cohort.plans
    )
    
    # Calculate completion percentage
    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Calculate average streak
    streaks = await prisma.streak.find_many(
        where={
            "userId": {
                "in": list(set(plan.userId for plan in cohort.plans))
            }
        }
    )
    avg_streak = sum(streak.currentStreak for streak in streaks) / len(streaks) if streaks else 0
    
    # Calculate monthly progress
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    monthly_tasks = sum(
        sum(1 for task in plan.tasks if task.timestamp >= one_month_ago)
        for plan in cohort.plans
    )
    monthly_completed = sum(
        sum(1 for task in plan.tasks if task.status == "COMPLETED" and task.timestamp >= one_month_ago)
        for plan in cohort.plans
    )
    monthly_progress = (monthly_completed / monthly_tasks * 100) if monthly_tasks > 0 else 0
    
    # Calculate individual learner progress
    learner_progress = {}
    for plan in cohort.plans:
        user_tasks = len(plan.tasks)
        completed_user_tasks = sum(1 for task in plan.tasks if task.status == "COMPLETED")
        progress = (completed_user_tasks / user_tasks * 100) if user_tasks > 0 else 0
        learner_progress[plan.user.email] = {
            "total_tasks": user_tasks,
            "completed_tasks": completed_user_tasks,
            "progress_percentage": progress
        }
    
    return {
        "success": True,
        "data": {
            "cohort_name": cohort.name,
            "total_learners": total_learners,
            "total_resources": total_resources,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_percentage": completion_percentage,
            "average_streak": avg_streak,
            "monthly_progress": monthly_progress,
            "learner_progress": learner_progress
        },
        "message": "Dashboard data retrieved successfully"
    }


async def _resend_notification_in_background(notification, prisma: Prisma):
    print(f"Resending notification for student {notification.studentId} and session {notification.sessionId}")
    user = await prisma.user.find_unique(where={"id": notification.studentId})
    if not user:
        print(f"User with ID {notification.studentId} not found for resending notification.")
        return

    session_details = await prisma.session.find_unique(where={"id": notification.sessionId})
    if not session_details:
        print(f"Session with ID {notification.sessionId} not found for resending notification.")
        return

    # Parse the two pointers from the stored message
    message_lines = notification.message.split('\n')
    pointer1 = ""
    pointer2 = ""
    for line in message_lines:
        if line.startswith('Pointer 1:'):
            pointer1 = line.replace('Pointer 1:', '').strip()
        elif line.startswith('Pointer 2:'):
            pointer2 = line.replace('Pointer 2:', '').strip()

    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)
    session_time_ist = datetime.now(ist).replace(hour=18, minute=0, second=0, microsecond=0)

    remaining_time_delta = session_time_ist - now_ist
    remaining_minutes = int(remaining_time_delta.total_seconds() / 60)

    if remaining_minutes > 0:
        status = f"Starting in {remaining_minutes} minutes"
    else:
        status = "Started"

    media = None
    if session_details.imageUrl:
        media = {
            "url": session_details.imageUrl,
            "filename": "session_image.jpg"
        }

    if user.phoneNumber:
        print(f"Attempting to resend WhatsApp message to {user.phoneNumber} for session {session_details.title}")
        await send_whatsapp_message(
            destination=user.phoneNumber,
            user_name=user.name,
            message_body_1=pointer1,
            message_body_2=pointer2,
            session_title=session_details.title,
            remaining_time="06:00 PM IST",
            status=status,
            media=media
        )
        
    # Removed the _process_notification_queue and _send_notifications_in_background functions

class SendNotificationPayload(BaseModel):
    sessionId: str

@router.post("/send-notifications")
async def send_notifications(
    sessionId: str = Query(...),
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client)
):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can send notifications")

    notifications_to_send = await prisma.notification.find_many(
        where={
            "status": "generated",
            "sessionId": sessionId
        },
        include={
            "user": True,
            "session": True
        }
    )

    if not notifications_to_send:
        return {"success": True, "message": "No generated notifications to send for this session."}

    for notification in notifications_to_send:
        try:
            # Fetch the user explicitly using studentId
            user_from_db = await prisma.user.find_unique(
                where={"id": notification.studentId}
            )

            if user_from_db and user_from_db.phoneNumber:
                whatsapp_number = user_from_db.phoneNumber
            else:
                print(f"Skipping WhatsApp notification for user {notification.studentId} (Name: {user_from_db.name if user_from_db else 'N/A'}) due to missing phone number.")
                continue
                
            # Extract pointer1 and pointer2 from the stored message
            message_lines = notification.message.split('\n')
            pointer1 = ""
            pointer2 = ""
            for line in message_lines:
                if line.startswith('Pointer 1:'):
                    pointer1 = line.replace('Pointer 1:', '').strip()
                elif line.startswith('Pointer 2:'):
                    pointer2 = line.replace('Pointer 2:', '').strip()
            # Calculate remaining time and status (re-introducing logic from _send_notifications_in_background)
            ist_offset = timedelta(hours=5, minutes=30)
            ist_timezone = timezone(ist_offset)

            now_ist = datetime.now(ist_timezone)

            # Assume notification.session.createdAt is UTC. Convert it to IST first.
            # If createdAt is naive, assume it's UTC and make it timezone-aware.
            if notification.session.createdAt.tzinfo is None:
                session_created_at_utc = notification.session.createdAt.replace(tzinfo=timezone.utc)
            else:
                session_created_at_utc = notification.session.createdAt.astimezone(timezone.utc)

            session_created_at_ist = session_created_at_utc.astimezone(ist_timezone)

            # Now replace the hour on the IST date to 6 PM IST
            session_time_ist = session_created_at_ist.replace(hour=18, minute=0, second=0, microsecond=0)

            remaining_time_delta = session_time_ist - now_ist
            remaining_minutes = int(remaining_time_delta.total_seconds() / 60)
            session_status = ""
            status = ""
            if remaining_minutes > 0:
                session_status = "starting soon"
                status = f"Starting in {remaining_minutes} minutes"
            else:
                session_status = "live"
                status = "Started"
            media = None
            if notification.session.imageUrl:
                media = {
                    "url": notification.session.imageUrl,
                    "filename": "session_image.jpg"
                }
            print(f"Attempting to send WhatsApp message to {whatsapp_number} for notification {notification.id}")
            await send_whatsapp_message(
                destination=whatsapp_number,
                user_name=notification.user.name,
                session_status = session_status,
                message_body_1=pointer1,
                message_body_2=pointer2,
                session_title=notification.session.title,
                remaining_time="06:00 PM IST", # This can be made dynamic if needed
                status=status,
                media=media
            )
            # await prisma.notification.update(
            #     where={"id": notification.id},
            #     data={
            #         "status": "sent"
            #     }
            # )
        except Exception as e:
            print(f"Failed to send notification {notification.id}: {e}")
            # await prisma.notification.update(
            #     where={"id": notification.id},
            #     data={
            #         "status": "failed"
            #     }
            # )
    return {"success": True, "message": f"Attempted to send {len(notifications_to_send)} notifications."}

@router.get("/build-in-public/users")
async def get_build_in_public_users(
    cohortId: Optional[str] = Query(None),
    prisma: Prisma = Depends(get_prisma_client)
):
    where_clause = {}
    if cohortId:
        where_clause["cohortId"] = cohortId

    users = await prisma.user.find_many(
        where=where_clause,
        include={
            'posts': True
        }
    )

    user_data = []
    for user in users:
        total_posts = len(user.posts)
        total_likes = sum(post.numLikes for post in user.posts)
        total_comments = sum(post.numComments for post in user.posts)
        last_posted = None
        if user.posts:
            last_posted = max(post.postedAt for post in user.posts).isoformat()

        user_data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "totalPosts": total_posts,
            "lastPosted": last_posted,
            "totalLikes": total_likes,
            "totalComments": total_comments,
        })
    # Sort by total posts (descending), then total likes (descending)
    user_data.sort(key=lambda x: (x["totalPosts"], x["totalLikes"]), reverse=True)
    return user_data

@router.get("/build-in-public/users/{user_id}/analytics")
async def get_user_analytics(user_id: str, prisma: Prisma = Depends(get_prisma_client)):
    user = await prisma.user.find_unique(
        where={'id': user_id},
        include={
            'posts': True,
            'streak': True
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_posts = len(user.posts)
    total_likes = sum(post.numLikes for post in user.posts)
    total_comments = sum(post.numComments for post in user.posts)

    # Calculate longest streak
    if user.posts:
        # Sort posts by postedAt to ensure correct streak calculation
        sorted_posts = sorted(user.posts, key=lambda p: p.postedAt)
        
        longest_streak = 0
        current_streak = 0
        last_post_date = None

        for post in sorted_posts:
            post_date = post.postedAt.date()
            if last_post_date is None:
                current_streak = 1
            elif (post_date - last_post_date).days == 1:
                current_streak += 1
            elif (post_date - last_post_date).days > 1:
                current_streak = 1
            
            longest_streak = max(longest_streak, current_streak)
            last_post_date = post_date
    else:
        longest_streak = 0

    # Calculate rank
    all_users = await prisma.user.find_many(include={'posts': True})
    users_with_posts = []
    for u in all_users:
        users_with_posts.append({
            "id": u.id,
            "totalPosts": len(u.posts)
        })
    users_with_posts.sort(key=lambda x: x["totalPosts"], reverse=True)

    rank = 1
    for i, u_data in enumerate(users_with_posts):
        if u_data["id"] == user_id:
            rank = i + 1
            break

    return {
        "name": user.name,
        "totalPosts": total_posts,
        "totalLikes": total_likes,
        "totalComments": total_comments,
        "currentStreak": user.streak.currentStreak if user.streak else 0,
        "longestStreak": longest_streak,
        "rank": rank,
    }

@router.get("/build-in-public/users/{user_id}/posts")
async def get_user_posts(user_id: str, prisma: Prisma = Depends(get_prisma_client)):
    user = await prisma.user.find_unique(
        where={'id': user_id},
        include={
            'posts': True
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Sort posts by postedAt in descending order (most recent first)
    sorted_posts = sorted(user.posts, key=lambda p: p.postedAt, reverse=True)

    return [
        {
            "id": post.id,
            "url": post.url,
            "postedAt": post.postedAt.isoformat(),
            "hasReacted": post.hasReacted
        }
        for post in sorted_posts
    ]


@router.put("/build-in-public/posts/{post_id}/react")
async def update_post_reaction_status(
    post_id: str,
    has_reacted: bool,
    prisma: Prisma = Depends(get_prisma_client)
):
    try:
        updated_post = await prisma.post.update(
            where={'id': post_id},
            data={'hasReacted': has_reacted}
        )
        return {"success": True, "message": "Post reaction status updated successfully", "post": updated_post}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update post reaction status: {e}")


@router.get("/build-in-public/users/{user_id}/heatmap")
async def get_user_heatmap_data(user_id: str, prisma: Prisma = Depends(get_prisma_client)):
    user = await prisma.user.find_unique(
        where={'id': user_id},
        include={
            'posts': True
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    heatmap_data = {}
    for post in user.posts:
        date = post.postedAt.strftime("%Y-%m-%d")
        heatmap_data[date] = heatmap_data.get(date, 0) + 1

    return heatmap_data
