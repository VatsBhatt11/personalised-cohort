import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from prisma import Prisma

# Load environment variables
load_dotenv()
# Initialize Prisma client
prisma_client = Prisma()

async def get_prisma_client():
    return prisma_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    retries = 5
    while retries > 0:
        try:
            print("entered")
            await prisma_client.connect()
            print("connected")
            break
        except Exception as e:
            print(f"Could not connect to Prisma, retrying... ({retries} attempts left): {e}")
            retries -= 1
            import asyncio
            await asyncio.sleep(5) # Wait for 5 seconds before retrying
    if retries == 0:
        raise Exception("Failed to connect to Prisma after multiple retries")
    yield
    print('disconnected')
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
from routes import auth, learner, instructor

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(learner.router, prefix="/api", tags=["learner"])
app.include_router(instructor.router, prefix="/api", tags=["instructor"])