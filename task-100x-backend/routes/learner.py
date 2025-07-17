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
    dayIndex: int

class PlanCreate(BaseModel):
    cohortId: str
    tasks: List[TaskCreate]

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
                        "dayIndex": task.dayIndex,
                        "status": "PENDING"
                    } for task in plan.tasks
                ]
            }
        },
        include={
            "tasks": True
        }
    )
    
    return {
        "success": True,
        "data": new_plan,
        "message": "Plan created successfully"
    }

@router.get("/plans/{cohort_id}")
async def get_plan(cohort_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)): 
    print(f"Attempting to retrieve plans for user: {current_user.id}, cohort: {cohort_id}")
    plans = await prisma.plan.find_many(
        where={
            "userId": current_user.id,
            "cohortId": cohort_id
        },
        include={
            "tasks": {
                "include": {
                    "resource": True
                }
            }
        },
        order={
            "createdAt": "desc"
        }
    )
    
    if not plans:
        return {
            "success": True,
            "data": None,
            "message": "No plans found for this cohort and user"
        }
    print(f"Found {len(plans)} plans for user: {current_user.id}, cohort: {cohort_id}")
    
    return {
        "success": True,
        "data": plans,
        "message": "Plans retrieved successfully"
    }

@router.patch("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    # Get task and verify ownership
    task = await prisma.task.find_unique(
        where={"id": task_id},
        include={"plan": True}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.plan.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to complete this task")
    
    # Update task status
    updated_task = await prisma.task.update(
        where={"id": task_id},
        data={"status": "COMPLETED"}
    )
    
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
    for plan in plans:
        for task in plan.tasks:
            week = task.resource.weekNumber
            if week not in weekly_progress:
                weekly_progress[week] = {
                    "total": 0,
                    "completed": 0
                }
            weekly_progress[week]["total"] += 1
            if task.status == "COMPLETED":
                weekly_progress[week]["completed"] += 1
    
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

    return {
        "success": True,
        "data": weekly_progress_list,
        "message": "Weekly progress retrieved successfully"
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