from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from prisma import Prisma
from main import get_prisma_client
from typing import List, Optional
from datetime import datetime, timedelta, timezone

class CohortCreate(BaseModel):
    name: str
    totalWeeks: int
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None

from .auth import get_current_user

router = APIRouter()


class ResourceCreate(BaseModel):
    cohortId: str
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]
    weekNumber: int

class WeeklyResourcePayload(BaseModel):
    id: Optional[str] = None
    title: str
    url: str
    type: str
    duration: int
    tags: List[str]

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
            "weekNumber": resource.weekNumber
        }
    )
    
    return {
        "success": True,
        "data": new_resource,
        "message": "Resource created successfully"
    }

@router.get("/cohorts")
async def get_cohorts(prisma: Prisma = Depends(get_prisma_client)):

    
    cohorts = await prisma.cohort.find_many()
    
    return {
        "success": True,
        "data": cohorts,
        "message": "Cohorts retrieved successfully"
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

@router.get("/resources/all_by_cohort/{cohort_id}")
async def get_all_resources_for_cohort(cohort_id: str, current_user = Depends(get_current_user), prisma: Prisma = Depends(get_prisma_client)):
    if current_user.role not in ["INSTRUCTOR", "LEARNER"]:
        raise HTTPException(status_code=403, detail="Only instructors and learners can view all resources for a cohort")
    
    resources = await prisma.resource.find_many(
        where={
            "cohortId": cohort_id
        }
    )
    
    # Group resources by week number
    weekly_resources = {}
    for resource in resources:
        if resource.weekNumber not in weekly_resources:
            weekly_resources[resource.weekNumber] = []
        weekly_resources[resource.weekNumber].append({
            "id": resource.id,
            "title": resource.title,
            "type": resource.type,
            "url": resource.url,
            "duration": resource.duration,
            "tags": resource.tags
        })
    
    # Convert to list of WeekResource objects, sorted by week number
    result = [
        {"week": week, "resources": weekly_resources[week]}
        for week in sorted(weekly_resources.keys())
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
    
    # Delete existing resources for this week and cohort
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
                "weekNumber": week_number
            }
        )
        created_resources.append(new_resource)
    
    return {
        "success": True,
        "data": created_resources,
        "message": f"Successfully created {len(created_resources)} resources for week {week_number}"
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