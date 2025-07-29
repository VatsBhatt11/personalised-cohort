from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from prisma import Prisma
from main import get_prisma_client
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
from twilio.rest import Client
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException
from prisma import Prisma
from modules.groq_client import generate_personalized_message
from routes.auth import get_current_user

# Initialize Twilio Client
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM')

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

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
    sessionTitle: Optional[str] = None
    sessionDescription: Optional[str] = None


    sessionTitle: Optional[str] = None
    sessionDescription: Optional[str] = None

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

@router.post("/quizzes")
async def create_quiz(quiz_data: QuizCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create quizzes")

    new_quiz = await prisma.quiz.create(
        data={
            "cohortId": quiz_data.cohortId,
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
            }
        },
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
        "data": new_quiz,
        "message": "Quiz created successfully"
    }

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

class WeeklyResourcePayload(BaseModel):
    id: Optional[str] = None
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]
    isOptional: Optional[bool] = False
    sessionTitle: Optional[str] = None
    sessionDescription: Optional[str] = None

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
            "isOptional": resource.isOptional,
            "sessionTitle": resource.sessionTitle,
            "sessionDescription": resource.sessionDescription
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
                isOptional=res.isOptional,
                sessionTitle=res.sessionTitle,
                sessionDescription=res.sessionDescription
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
async def create_cohort(cohort: CohortCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role != "INSTRUCTOR":
        raise HTTPException(status_code=403, detail="Only instructors can create cohorts")
    
    # Calculate start and end dates
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(weeks=cohort.totalWeeks)

    new_cohort = await prisma.cohort.create(
        data={
            "name": cohort.name,
            "totalWeeks": cohort.totalWeeks,
            "startDate": start_date,
            "endDate": end_date
        }
    )
    
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
            "isOptional": resource.isOptional,
            "sessionTitle": resource.sessionTitle,
            "sessionDescription": resource.sessionDescription
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
            "sessionTitle": None,
            "sessionDescription": None
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

    # Create new resources
    created_resources = []
    for resource in resources:
        new_resource = await prisma.resource.create(
            data={
                "cohortId": cohort_id,
                "title": resource.title,
                "url": resource.url,
                "type": resource.type,
                "duration": resource.duration,
                "tags": resource.tags,
                "weekNumber": week_number,
                "isOptional": resource.isOptional,
                "sessionTitle": resource.sessionTitle,
                "sessionDescription": resource.sessionDescription
            }
        )
        created_resources.append(new_resource)

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

    # Generate and store personalized notifications for each user
    for user in users_with_launchpad:
        if user.launchpad and resource.sessionTitle and resource.sessionDescription:
            # Construct the context for the prompt
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
                "upcoming_session_title": resource.sessionTitle,
                "upcoming_session_description": resource.sessionDescription
            }

            # Call Groq API to generate message
            personalized_message = await generate_personalized_message(context)

            # Store notification
            new_notification = await prisma.notification.create(
                data={
                    "studentId": user.id,
                    "sessionId": new_resource.id, # Assuming resource ID can be session ID
                    "message": personalized_message
                }
            )

            # Send WhatsApp notification if user has a phone number
            if user.phoneNumber and TWILIO_WHATSAPP_FROM:
                try:
                    twilio_client.messages.create(
                        from_=f'whatsapp:{TWILIO_WHATSAPP_FROM}',
                        to=f'whatsapp:{user.phoneNumber}',
                        body=personalized_message
                    )
                    print(f"WhatsApp message sent to {user.phoneNumber} for session {new_resource.id}")
                except Exception as e:
                    print(f"Error sending WhatsApp message to {user.phoneNumber}: {e}")

    # Re-create tasks for existing plans based on the new resources
    for plan in plans_to_update:
        tasks_to_create = []
        for idx, new_resource in enumerate(created_resources):
            # Check if a task for this resource already existed in the plan and was completed
            # This part is tricky because the old tasks are deleted.
            # For simplicity, we will re-create all tasks as PENDING.
            # If preserving completion status is critical, a more complex mapping is needed.
            tasks_to_create.append({
                "resourceId": new_resource.id,
                "status": "PENDING",
                "assignedDate": datetime.now(timezone.utc)
            })
        
        if tasks_to_create:
            await prisma.task.create_many(
                data=[
                    {
                        "planId": plan.id,
                        **task_data
                    } for task_data in tasks_to_create
                ]
            )

    return {
        "success": True,
        "data": created_resources,
        "message": f"Successfully created {len(created_resources)} resources and updated tasks for week {week_number}"
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