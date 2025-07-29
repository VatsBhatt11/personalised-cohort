import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma

# Load environment variables
load_dotenv()
# Initialize Prisma client
prisma_client = Prisma()

async def get_prisma_client():
    return prisma_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    await prisma_client.connect()
    yield
    await prisma_client.disconnect()

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Import and include routers
from routes import auth, instructor, learner

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(learner.router, prefix="/api", tags=["learner"])
app.include_router(instructor.router, prefix="/api", tags=["instructor"])

# For development - run with: python main.py
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)