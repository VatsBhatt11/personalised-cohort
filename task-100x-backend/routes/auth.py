from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from prisma import Prisma
from main import get_prisma_client
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import APIRouter, Depends, HTTPException
import os

router = APIRouter()
async def get_db(prisma: Prisma = Depends(get_prisma_client)):
    return prisma
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY")  # Fixed: matches render.yaml
ALGORITHM = os.getenv("ALGORITHM", "HS256")  # Now reads from env with fallback
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "180"))

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    cohortId: Optional[str] = None
    name: Optional[str] = None
    phoneNumber: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    token: str
    token_type: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), prisma: Prisma = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await prisma.user.find_unique(where={"email": email})
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup")
async def signup(user: UserCreate, prisma: Prisma = Depends(get_db)):
    # Check if user already exists
    existing_user = await prisma.user.find_unique(
        where={"email": user.email}
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = pwd_context.hash(user.password)
    
    # Create user
    new_user = await prisma.user.create(
        data={
            "email": user.email,
            "password": hashed_password,
            "role": user.role,
            "cohortId": user.cohortId,
            "name": user.name,
            "phoneNumber": user.phoneNumber
        }
    )
    
    # Create access token
    token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.email}, expires_delta=token_expires
    )
    
    return {
        "success": True,
        "data": {
            "token": token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "role": new_user.role,
                "cohortId": new_user.cohortId
            }
        },
        "message": "User created successfully"
    }

@router.post("/login")
async def login(user: UserLogin, prisma: Prisma = Depends(get_db)):
    # Find user
    db_user = await prisma.user.find_unique(
        where={"email": user.email}
    )
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Verify password
    if not pwd_context.verify(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Create access token
    token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.email}, expires_delta=token_expires
    )
    
    return {
        "success": True,
        "data": {
            "token": token,
            "token_type": "bearer",
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "name": db_user.name,
                "role": db_user.role
            }
        },
        "message": "Login successful"
    }