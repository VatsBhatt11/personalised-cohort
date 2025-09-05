# modules/db_connector.py

import os
import asyncio
from dotenv import load_dotenv
from prisma import Prisma

load_dotenv()

class DBConnection:
    """
    Manages Prisma DB connection and user-related operations.
    """

    # TODO: Insert users' cohort details (optional auto-assignment logic)
    # TODO: Add cohort fetch method for UI (e.g., get_active_cohorts())
    # TODO: Add support for 'upsert' in insert_user_from_row()
    # TODO: Add audit logging (success/failure per user insert)
    # TODO: Add update_user_details(user_id, data) for profile edits

    def __init__(self):
        self.db = Prisma()
        self.connected = False

    async def connect(self):
        try:
            await self.db.connect()
            await self.db.user.find_first()
            self.connected = True
        except Exception as e:
            self.connected = False
            self._last_error = str(e)  # For external debug

    def get_client(self) -> Prisma:
        return self.db

    async def insert_user_from_row(self, row: dict, on_duplicate: str = "skip", cohort_id: str = None) -> dict:
        """
        Insert a user and launchpad row from a CSV row dict.

        Returns:
            dict: {status, reason, email, user_id, error?}
        """
        email = row.get("Email") or row.get("email")
        if not self.connected:
            return {
                "status": "failure",
                "reason": "connection failed",
                "email": email,
                "user_id": None
            }

        if not email:
            return {
                "status": "failure",
                "reason": "missing email",
                "email": None,
                "user_id": None
            }

        try:
            existing = await self.db.user.find_unique(where={"email": email})
            if existing and on_duplicate == "skip":
                return {
                    "status": "skipped",
                    "reason": "duplicate",
                    "email": email,
                    "user_id": existing.id
                }

            phone = row.get("Phone Number") or row.get("phone") or row.get("Phone") or None
            phone = phone.strip() if isinstance(phone, str) else None

            user = await self.db.user.create(
                data={
                    "email": email,
                    "password": "from_csv",
                    "name": row.get("Name"),
                    "phoneNumber": phone,
                    "createdFrom": "csv",
                    "role": "LEARNER",
                    "cohortId": cohort_id
                }
            )

            await self.db.launchpad.create(
                data={
                    "userId": user.id,
                    "isStudent": row.get("Student", "").strip().lower() == "yes",
                    "workExperience": row.get("Work Experience", "").strip().lower() == "yes",
                    "studyStream": row.get("Study Stream", ""),
                    "expectedOutcomes": row.get("Expected Outcomes", ""),
                    "codingFamiliarity": row.get("Coding Familiarity", ""),
                    "pythonFamiliarity": row.get("Python Familiarity", ""),
                    "languages": row.get("Languages", ""),
                    "yearsOfExperience": row.get("Years of Experience", "")
                }
            )

            return {
                "status": "success",
                "reason": None,
                "email": email,
                "user_id": user.id
            }

        except Exception as e:
            return {
                "status": "failure",
                "reason": "insertion error",
                "email": email,
                "user_id": None,
                "error": str(e)
            }
    async def get_user_details(self, user_id: str) -> dict:
        """
        Fetch a user and their launchpad data by user_id.

        Returns:
            dict with user info and launchpad data if found,
            or error details if not found.
        """
        if not self.connected:
            return {
                "status": "failure",
                "reason": "connection failed",
                "user_id": user_id,
                "data": None
            }

        try:
            user = await self.db.user.find_unique(where={"id": user_id})
            if not user:
                return {
                    "status": "failure",
                    "reason": "user not found",
                    "user_id": user_id,
                    "data": None
                }

            launchpad = await self.db.launchpad.find_unique(where={"userId": user_id})

            return {
                "status": "success",
                "user_id": user_id,
                "data": {
                    "user": user.dict(),
                    "launchpad": launchpad.dict() if launchpad else None
                }
            }

        except Exception as e:
            return {
                "status": "failure",
                "reason": "query error",
                "user_id": user_id,
                "error": str(e)
            }
