# Cohort Learning Platform Backend

A FastAPI backend for a cohort-based learning platform that personalizes and gamifies weekly content consumption.

## Features

- User authentication with JWT tokens
- Role-based access control (Learner/Instructor)
- Resource management for cohorts
- Task planning and tracking
- Streak system for engagement
- Analytics dashboard for instructors

## Tech Stack

- **FastAPI**: Modern Python web framework
- **Prisma**: Next-generation ORM
- **PostgreSQL**: Database (via Supabase)
- **Docker**: Containerization

## API Endpoints

### Authentication
- `POST /auth/signup`: Register new user
- `POST /auth/login`: User login

### Learner Endpoints
- `POST /api/plans`: Generate task plan
- `GET /api/plans/{cohort_id}`: Get cohort plan
- `PATCH /api/tasks/{task_id}/complete`: Complete task
- `GET /api/streaks/me`: Get streak info
- `GET /api/progress/weekly`: Get weekly progress

### Instructor Endpoints
- `POST /api/resources`: Add resource
- `GET /api/resources/{cohort_id}/{week_number}`: Get weekly resources
- `GET /api/dashboard/{cohort_id}`: Get cohort analytics

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and update the values
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Generate Prisma client:
   ```bash
   prisma generate
   ```

5. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

## Docker Setup

1. Build and start containers:
   ```bash
   docker-compose up --build
   ```

2. The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database Schema

- **User**: Authentication and role management
- **Cohort**: Group management
- **Resource**: Learning materials
- **Plan**: User's learning plan
- **Task**: Individual assignments
- **Streak**: Engagement tracking

## Response Format

All API endpoints follow a consistent response format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

## Error Handling

Errors are returned in the following format:

```json
{
  "detail": "Error message"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request