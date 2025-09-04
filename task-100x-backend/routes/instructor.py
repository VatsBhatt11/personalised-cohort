from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from prisma import Prisma
from main import get_prisma_client
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import asyncio
import time
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, Form, UploadFile, File
import csv
from prisma import Prisma
from modules.groq_client import generate_personalized_message, generate_quiz_from_transcription
from routes.auth import get_current_user
from modules.aisensy_client import send_whatsapp_message
from modules.db_connector import DBConnection

router = APIRouter()


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

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weekNumber: Optional[int] = None
    lectureNumber: Optional[int] = None
    imageUrl: Optional[str] = None

class CreateSessionResponse(BaseModel):
    id: str
    title: str
    description: str
    weekNumber: int
    cohortId: str
    createdAt: datetime
    updatedAt: datetime
    success: bool
    message: str

class SessionResponse(BaseModel):
    id: str
    title: str
    description: str
    weekNumber: int
    cohortId: str
    createdAt: datetime
    updatedAt: datetime

class WeeklyResourcePayload(BaseModel):
    id: Optional[str] = None
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]
    isOptional: Optional[bool] = False
    quizId: Optional[str] = None

@router.post("/cohorts/{cohort_id}/sessions", response_model=SessionResponse)
async def create_session(
    cohort_id: str,
    title: str = Form(...),
    description: str = Form(...),
    weekNumber: int = Form(...),
    lectureNumber: int = Form(...),
    image: UploadFile = File(None),
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
            asyncio.create_task(send_whatsapp_message(notification.message, notification.recipient))
        
        return {
            "success": True,
            "data": SessionResponse.model_validate(existing_session.model_dump()),
            "message": "Session already exists, notifications resent."
        }

    image_url = None
    if image:
        file_path = f"uploads/{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/{file_path}"

    new_session = await prisma.session.create(
        data={
            "cohortId": cohort_id,
            "title": title,
            "description": description,
            "weekNumber": weekNumber,
            "lectureNumber": lectureNumber,
            "imageUrl": image_url
        }
    )

    # Asynchronously send notification for new session
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

    for user in users_with_launchpad:
        asyncio.create_task(_send_notifications_in_background(user, new_session, prisma))

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
                "PhoneNumber": row_data.get("PhoneNumber") if row_data.get("PhoneNumber") else None,
                "Student": row_data.get("Student"),
                "Work Experience": row_data.get("Work Experience"),
                "Study Stream": row_data.get("Study Stream"),
                "Expected Outcomes": row_data.get("Expected Outcomes"),
                "Coding Familiarity": row_data.get("Coding Familiarity"),
                "Python Familiarity": row_data.get("Python Familiarity"),
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
        personalized_message = await generate_personalized_message(context)

        # Calculate remaining time and status
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        session_time_ist = datetime.now(ist).replace(hour=18, minute=0, second=0, microsecond=0)

        remaining_time_delta = session_time_ist - now_ist
        remaining_minutes = int(remaining_time_delta.total_seconds() / 60)

        if remaining_minutes > 0:
            status = f"Starting in {remaining_minutes} minutes"
            remaining_time = f"{remaining_minutes} minutes"
        else:
            status = "Started"
            remaining_time = "0 minutes"

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
                message_body=personalized_message,
                session_title=session_details.title,
                remaining_time=remaining_time,
                status=status,
                media=media
            )
        
        await prisma.notification.create(
            data={
                "studentId": user.id,
                "sessionId": session_details.id,
                "message": personalized_message,
                "status": "SENT",
            }
        )

        if user.phoneNumber:
            print(f"Attempting to send WhatsApp message to {user.phoneNumber} for session {session_details.id}")
            media = None
            if session_details.imageUrl:
                media = {
                    "url": session_details.imageUrl,
                    "filename": "session_image.jpg"
                }
            await send_whatsapp_message(
                destination=user.phoneNumber,
                user_name=user.name,
                message_body=personalized_message,
                session_title=session_details.title,
                remaining_time=remaining_time,
                status=status,
                media=media
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
    prisma: Prisma = Depends(get_prisma_client)
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
            "lectureNumber": lectureNumber,
            "imageUrl": image_url if image_url else existing_session.imageUrl # Keep existing image if no new one is uploaded
        }
    )

    # Asynchronously send notification for updated session
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

    for user in users_with_launchpad:
        asyncio.create_task(_send_notifications_in_background(user, updated_session, prisma))

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