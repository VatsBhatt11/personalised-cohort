from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.get("/build-in-public/users")
async def get_build_in_public_users():
    db = Prisma()
    await db.connect()
    users = await db.user.find_many(
        include={
            'Post': {
                'select': {
                    'numLikes': True,
                    'numComments': True,
                    'createdAt': True,
                }
            }
        }
    )

    user_data = []
    for user in users:
        total_posts = len(user.Post)
        total_likes = sum(post.numLikes for post in user.Post)
        total_comments = sum(post.numComments for post in user.Post)
        last_posted = None
        if user.Post:
            last_posted = max(post.createdAt for post in user.Post).isoformat()

        user_data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "totalPosts": total_posts,
            "lastPosted": last_posted,
            "totalLikes": total_likes,
            "totalComments": total_comments,
        })
    await db.disconnect()
    return user_data

@router.get("/build-in-public/users/{user_id}/name")
async def get_user_name(user_id: str):
    db = Prisma()
    await db.connect()
    user = await db.user.find_unique(where={'id': user_id})
    await db.disconnect()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"name": user.name}

@router.get("/build-in-public/users/{user_id}/analytics")
async def get_user_analytics(user_id: str):
    db = Prisma()
    await db.connect()
    user = await db.user.find_unique(
        where={'id': user_id},
        include={
            'Post': {
                'select': {
                    'createdAt': True,
                    'numLikes': True,
                    'numComments': True,
                }
            },
            'streak': {
                'select': {
                    'currentStreak': True,
                    'weeklyStreak': True,
                }
            }
        }
    )
    await db.disconnect()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_posts = len(user.Post)
    total_likes = sum(post.numLikes for post in user.Post)
    total_comments = sum(post.numComments for post in user.Post)

    # Calculate longest streak (simplified for now, can be improved with more complex logic)
    # This assumes posts are sorted by createdAt, which they are not by default from Prisma
    # For a true streak, you'd need to fetch all posts, sort them, and then calculate consecutive days
    longest_streak = user.streak.currentStreak if user.streak else 0

    # For rank, you would need to query all users and sort them by a metric (e.g., total_posts)
    # This is a placeholder and would require a more complex query
    rank = 1 # Placeholder

    return {
        "totalPosts": total_posts,
        "totalLikes": total_likes,
        "totalComments": total_comments,
        "currentStreak": user.streak.currentStreak if user.streak else 0,
        "longestStreak": longest_streak,
        "rank": rank,
    }

@router.get("/users/{userId}/heatmap")
async def get_user_heatmap(
    userId: str,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    prisma: PrismaClient = Depends(get_prisma_client),
):
    try:
        start_date_obj = datetime.fromisoformat(startDate.replace("Z", "+00:00"))
        end_date_obj = datetime.fromisoformat(endDate.replace("Z", "+00:00"))

        posts = await prisma.post.find_many(
            where={
                "userId": userId,
                "createdAt": {
                    "gte": start_date_obj,
                    "lte": end_date_obj,
                },
            },
            select={
                "createdAt": True,
            },
        )

        heatmap_data = defaultdict(int)
        for post in posts:
            date_key = post.createdAt.strftime("%Y-%m-%d")
            heatmap_data[date_key] += 1

        return JSONResponse(content=dict(heatmap_data), status_code=200)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))