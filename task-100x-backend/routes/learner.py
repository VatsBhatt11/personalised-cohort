from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from .auth import get_current_user
from main import get_prisma_client

router = APIRouter()

class TaskCreate(BaseModel):
    resourceId: str

class PlanCreate(BaseModel):
    cohortId: str
    tasks: List[TaskCreate]

class QuizAnswerCreate(BaseModel):
    questionId: str
    optionId: Optional[str] = None
    answerText: Optional[str] = None

class QuizAttemptCreate(BaseModel):
    quizId: str
    answers: List[QuizAnswerCreate]

class FeedbackReportResponse(BaseModel):
    id: str
    quizAttemptId: str
    feedbackText: str
    createdAt: datetime

class QuizAttemptResponse(BaseModel):
    id: str
    quizId: str
    learnerId: str
    score: Optional[float] = None
    submittedAt: datetime
    feedbackReport: Optional[FeedbackReportResponse] = None

class QuestionResponse(BaseModel):
    id: str
    text: str
    options: List[dict]
    type: str

class QuizResponse(BaseModel):
    id: str
    cohortId: str
    weekNumber: int
    questions: List[QuestionResponse]

@router.post("/plans")
async def create_plan(plan: PlanCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)): 
    if current_user.role != "LEARNER":
        raise HTTPException(status_code=403, detail="Only learners can create plans")
    
    # Create plan with tasks
    new_plan = await prisma.plan.create(
        data={
            "userId": current_user.id,
            "cohortId": plan.cohortId,
            "tasks": {
                "create": [
                    {
                        "resourceId": task.resourceId,

                        "status": "PENDING",
                        "assignedDate": datetime.now(timezone.utc)
                    } for task in plan.tasks
                ]
            }
        },
        include={
            "tasks": True
        }
    )

@router.get("/quiz-attempts/{quiz_id}/status")
async def get_quiz_attempt_status(quiz_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    quiz_attempt = await prisma.quizattempt.find_first(
        where={
            "quizId": quiz_id,
            "learnerId": current_user.id
        },
        order={
            "submittedAt": "desc"
        }
    )

    if not quiz_attempt:
        return {
            "success": True,
            "data": {
                "status": "NOT_ATTEMPTED"
            },
            "message": "Quiz not yet attempted"
        }

    if quiz_attempt.score is not None:
        return {
            "success": True,
            "data": {
                "status": "COMPLETED",
                "score": quiz_attempt.score
            },
            "message": "Quiz completed with score"
        }
    else:
        return {
            "success": True,
            "data": {
                "status": "IN_PROGRESS"
            },
            "message": "Quiz in progress"
        }
    
    return {
        "success": True,
        "data": new_plan,
        "message": "Plan created successfully"
    }

@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz_for_resource(quiz_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
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
        raise HTTPException(status_code=404, detail="Quiz not found for this resource")

    return QuizResponse(
        id=quiz.id,
        cohortId=quiz.cohortId,
        weekNumber=quiz.weekNumber,
        questions=[
            QuestionResponse(
                id=q.id,
                text=q.questionText,
                options=[{"id": opt.id, "text": opt.optionText} for opt in q.options],
                type=q.questionType
            ) for q in quiz.questions
        ]
    )

@router.get("/plans/{cohort_id}")
async def get_plan(cohort_id: str, week_number: Optional[int] = None, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):  
    print(f"Attempting to retrieve plan for user: {current_user.id}, cohort: {cohort_id}, week: {week_number}")
    
    # Try to find an existing plan for the current week
    where_clause = {
        "userId": current_user.id,
        "cohortId": cohort_id,
    }

    if week_number is not None:
        where_clause["tasks"] = {
            "some": {
                "resource": {
                    "weekNumber": week_number
                }
            }
        }

    plan = await prisma.plan.find_first(
        where=where_clause,
        include={
            "tasks": {
                "include": {
                    "resource": True
                }
            }
        }
    )
    
    if not plan:
        # If no plan exists for this week, check for resources for this week
        resources_for_week = []
        if week_number is not None:
            resources_for_week = await prisma.resource.find_many(
                where={
                    "cohortId": cohort_id,
                    "weekNumber": week_number
                }
            )
        
        if resources_for_week:
            # Create a new plan and tasks for these resources
            new_plan = await prisma.plan.create(
                data={
                    "userId": current_user.id,
                    "cohortId": cohort_id,
                    "tasks": {
                        "create": [
                            {
                                "resourceId": resource.id,
                                "status": "PENDING",
                                "assignedDate": datetime.now(timezone.utc)
                            } for resource in resources_for_week
                        ]
                    }
                },
                include={
                    "tasks": {
                        "include": {
                            "resource": True
                        }
                    }
                }
            )
            print(f"Created new plan for user: {current_user.id}, cohort: {cohort_id}, week: {week_number}")
            return {
                "success": True,
                "data": new_plan,
                "message": "Plan created and retrieved successfully"
            }
        else:
            return {
                "success": True,
                "data": None,
                "message": "No plan or resources found for this cohort and week"
            }
    
    print(f"Found plan for user: {current_user.id}, cohort: {cohort_id}, week: {week_number}")
    
    return {
        "success": True,
        "data": plan,
        "message": "Plan retrieved successfully"
    }

@router.post("/quiz-attempts", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(attempt_data: QuizAttemptCreate, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    # 1. Validate Quiz and Questions
    quiz = await prisma.quiz.find_unique(
        where={
            "id": attempt_data.quizId
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

    # 2. Create QuizAttempt
    quiz_attempt = await prisma.quizattempt.create(
        data={
            "quizId": attempt_data.quizId,
            "learnerId": current_user.id,
            "submittedAt": datetime.now(timezone.utc),
            "quizAnswers": {
                "create": [
                    {
                        "questionId": ans.questionId,
                        "selectedOptionId": ans.optionId if ans.optionId else None,
                        "answerText": ans.answerText
                    } for ans in attempt_data.answers
                ]
            }
        },
        include={
            "quizAnswers": True
        }
    )

    # 3. Generate Feedback (using Groq API)
    # This is a placeholder. You'll need to integrate with Groq API here.
    # For now, let's create a dummy feedback report.
    feedback_text = "This is a dummy feedback report. Integrate with Groq API for real feedback."

    feedback_report = await prisma.feedbackreport.create(
        data={
            "quizAttemptId": quiz_attempt.id,
            "feedbackText": feedback_text,
            "createdAt": datetime.now(timezone.utc)
        }
    )

    # 4. Calculate Score (dummy for now, implement actual scoring logic)
    score = 0.0 # Placeholder for actual scoring logic

    updated_quiz_attempt = await prisma.quizattempt.update(
        where={
            "id": quiz_attempt.id
        },
        data={
            "score": score
        },
        include={
            "feedbackReport": True
        }
    )

    return QuizAttemptResponse(
        id=updated_quiz_attempt.id,
        quizId=updated_quiz_attempt.quizId,
        learnerId=updated_quiz_attempt.learnerId,
        score=updated_quiz_attempt.score,
        submittedAt=updated_quiz_attempt.submittedAt,
        feedbackReport=FeedbackReportResponse(
            id=feedback_report.id,
            quizAttemptId=feedback_report.quizAttemptId,
            feedbackText=feedback_report.feedbackText,
            createdAt=feedback_report.createdAt
        ) if feedback_report else None
    )

@router.patch("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    updated_task = await prisma.task.update(
        where={
            "id": task_id,
            "plan": {
                "userId": current_user.id
            }
        },
        data={
            "status": "COMPLETED",
            "completedAt": datetime.now(timezone.utc)
        }
    )

    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")

    # Fetch the task again with its relations to ensure we have the latest data
    task = await prisma.task.find_unique(
        where={
            "id": task_id
        },
        include={
            "resource": True,
            "plan": {
                "include": {
                    "cohort": True
                }
            }
        }
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found after update and fetch")
    
    if task.resource is None:
        raise HTTPException(status_code=500, detail="Associated resource not found for the task. Data inconsistency.")
    
    # Update streak
    streak = await prisma.streak.find_unique(
        where={"userId": current_user.id}
    )
    
    now = datetime.now(timezone.utc)
    
    if not streak:
        # Create new streak
        streak = await prisma.streak.create(
            data={
                "userId": current_user.id,
                "currentStreak": 1,
                "lastCompletedDate": now
            }
        )
    else:
        # Update existing streak
        last_completed = streak.lastCompletedDate
        days_diff = (now - last_completed).days
        
        if days_diff <= 1:
            # Maintain or increment streak
            new_streak = streak.currentStreak + (1 if days_diff == 1 else 0)
        else:
            # Reset streak
            new_streak = 1
        
        streak = await prisma.streak.update(
            where={"userId": current_user.id},
            data={
                "currentStreak": new_streak,
                "lastCompletedDate": now
            }
        )

    # Check for weekly streak
    # Get all required tasks for the current week for the user's plan
    # Assuming a user has only one active plan at a time for simplicity
    user_plan = await prisma.plan.find_first(
        where={
            "userId": current_user.id,
            "cohortId": task.plan.cohortId # Assuming task.plan.cohortId is available
        },
        include={
            "tasks": {
                "include": {
                    "resource": True
                }
            }
        }
    )

    if user_plan:
        # Filter tasks for the current week and required resources
        current_week_tasks = [t for t in user_plan.tasks if t.resource and t.resource.weekNumber == task.resource.weekNumber and not t.resource.isOptional]
        
        # Check if all required tasks for the week are completed within 8 days of assignment
        all_required_completed_on_time = True
        for t in current_week_tasks:
            if t.status != "COMPLETED" or not t.completedAt or not t.assignedDate or (t.completedAt - t.assignedDate).days > 7:
                all_required_completed_on_time = False
                break
        
        if all_required_completed_on_time and (streak.lastWeeklyStreakAwardedWeek is None or streak.lastWeeklyStreakAwardedWeek < task.resource.weekNumber):
            # Increment weekly streak and update lastWeeklyStreakAwardedWeek
            await prisma.streak.update(
                where={"userId": current_user.id},
                data={
                    "weeklyStreak": {"increment": 1},
                    "lastWeeklyStreakAwardedWeek": task.resource.weekNumber
                }
            )
        elif not all_required_completed_on_time and streak.weeklyStreak > 0:
            # Reset weekly streak if not all required tasks are completed on time and streak is not 0
            await prisma.streak.update(
                where={"userId": current_user.id},
                data={
                    "weeklyStreak": 0
                }
            )
    
    return {
        "success": True,
        "data": {
            "task": updated_task,
            "streak": streak
        },
        "message": "Task completed successfully"
    }

@router.get("/streaks/me")
async def get_streak(current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)): 
    streak = await prisma.streak.find_unique(
        where={"userId": current_user.id}
    )
    
    if not streak:
        return {
            "success": True,
            "data": {
                "currentStreak": 0,
                "lastCompletedDate": None
            },
            "message": "No streak found"
        }
    
    return {
        "success": True,
        "data": streak,
        "message": "Streak retrieved successfully"
    }

@router.get("/progress/weekly")
async def get_weekly_progress(current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)): 
    # Get all tasks for the user
    plans = await prisma.plan.find_many(
        where={"userId": current_user.id},
        include={
            "tasks": {
                "include": {
                    "resource": True
                }
            }
        }
    )
    
    # Calculate weekly progress
    weekly_progress = {}
    total_required_resources = 0
    completed_required_resources = 0

    for plan in plans:
        for task in plan.tasks:
            # Only consider required resources for completion rate
            if not task.resource.isOptional:
                total_required_resources += 1
                if task.status == "COMPLETED":
                    completed_required_resources += 1

                week = task.resource.weekNumber
                if week not in weekly_progress:
                    weekly_progress[week] = {
                        "total": 0,
                        "completed": 0
                    }
                weekly_progress[week]["total"] += 1
                if task.status == "COMPLETED":
                    weekly_progress[week]["completed"] += 1

    completion_rate = (completed_required_resources / total_required_resources) * 100 if total_required_resources > 0 else 0

    return {
        "success": True,
        "data": {
            "weeklyProgress": weekly_progress,
            "completionRate": completion_rate
        },
        "message": "Weekly progress retrieved successfully"
    }
    
    # Calculate completion percentages
    for week in weekly_progress:
        total = weekly_progress[week]["total"]
        completed = weekly_progress[week]["completed"]
        weekly_progress[week]["percentage"] = (completed / total * 100) if total > 0 else 0
    
    # Convert dictionary to list of WeeklyProgress objects
    weekly_progress_list = [
        {
            "week": week,
            "completedTasks": weekly_progress[week]["completed"],
            "totalTasks": weekly_progress[week]["total"],
            "progress": weekly_progress[week]["percentage"]
        }
        for week in sorted(weekly_progress.keys())
    ]

    

@router.get("/leaderboard")
async def get_leaderboard(current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role not in ["INSTRUCTOR", "LEARNER"]:
        raise HTTPException(status_code=403, detail="Only instructors and learners can view the leaderboard")

    users = await prisma.user.find_many(
        where={
            "role": "LEARNER"
        },
        include={
            "plans": {
                "include": {
                    "tasks": {
                        "include": {
                            "resource": True
                        }
                    }
                }
            },
            "streak": True
        }
    )

    leaderboard_data = []
    for user in users:
        total_required_resources = 0
        completed_required_resources = 0
        completion_times = []

        for plan in user.plans:
            for task in plan.tasks:
                if not task.resource.isOptional:
                    total_required_resources += 1
                    if task.status == "COMPLETED":
                        completed_required_resources += 1
                        if task.completedAt and task.assignedDate:
                            completion_times.append((task.completedAt - task.assignedDate).total_seconds())

        completion_rate = (completed_required_resources / total_required_resources) * 100 if total_required_resources > 0 else 0
        daily_streak = user.streak.currentStreak if user.streak else 0
        weekly_streak = user.streak.weeklyStreak if user.streak else 0
        shortest_completion_time = min(completion_times) if completion_times else None

        leaderboard_data.append({
            "email": user.email,
            "completionRate": completion_rate,
            "dailyStreak": daily_streak,
            "weeklyStreak": weekly_streak,
            "shortestCompletionTime": shortest_completion_time
        })

    # Sort leaderboard data
    leaderboard_data.sort(key=lambda x: (
        -x["completionRate"],  # Descending
        -x["dailyStreak"],     # Descending
        -x["weeklyStreak"],    # Descending
        x["shortestCompletionTime"] # Ascending
    ))

    return {
        "success": True,
        "data": leaderboard_data,
        "message": "Leaderboard data retrieved successfully"
    }

@router.get("/cohorts/current")
async def get_current_cohort(current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if not current_user.cohortId:
        raise HTTPException(status_code=404, detail="User is not assigned to a cohort")
    
    cohort = await prisma.cohort.find_unique(
        where={
            "id": current_user.cohortId
        }
    )
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    return {
        "success": True,
        "data": cohort,
        "message": "Current cohort retrieved successfully"
    }