# Backend API (task-100x-backend)

This directory contains the backend API for the Personalised Cohort Learning Platform.

## Technologies Used

This project is built with:

- Python
- FastAPI (for API endpoints)
- Prisma (for ORM and database interactions)
- PostgreSQL (database)

## Setup and Development

To get the backend API up and running, follow these steps:

1.  **Navigate to the backend directory:**

    ```sh
    cd task-100x-backend
    ```

2.  **Create a Virtual Environment (Recommended):**

    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install Dependencies:**

    ```sh
    pip install -r requirements.txt
    ```

4.  **Set up Database (Prisma Migrate):**

    Ensure your PostgreSQL database is running and configured correctly. Then, apply migrations:

    ```sh
    npx prisma migrate dev --name init
    ```

    *Note: You might need to install `npm` and `npx` if you don't have them, as Prisma CLI is typically distributed via npm.*

5.  **Generate Prisma Client:**

    ```sh
    npx prisma generate
    ```

6.  **Start the Development Server:**

    ```sh
    uvicorn main:app --reload
    ```

    The API will be accessible at `http://localhost:8000` (default FastAPI port).

## API Endpoints

Key API endpoints are defined in `routes/` directory:

-   `auth.py`: User authentication and authorization.
-   `instructor.py`: Endpoints for instructor-specific functionalities.
-   `learner.py`: Endpoints for learner-specific functionalities, including quiz submission.

## Database Schema

The database schema is defined in `schema.prisma`. It includes models for `User`, `Cohort`, `Quiz`, `Question`, `Option`, `QuizAttempt`, `QuizAnswer`, and more.

## Important Notes

-   Ensure environment variables for database connection are set (e.g., `DATABASE_URL`).
-   For frontend-related issues or setup, refer to the `task-100x/README.md` file.