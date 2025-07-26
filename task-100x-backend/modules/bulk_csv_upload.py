# modules/bulk_csv_upload.py

import asyncio
import pandas as pd
from db_connector import DBConnection

"""
CSV to Prisma Schema Mapping Summary
------------------------------------

This script processes a CSV file with the following assumptions:

Mapped to User table:
- Name            → User.name
- Email           → User.email
- Password        → Defaults to 'from_csv'
- Role            → Defaults to 'LEARNER'
- createdFrom     → Set to 'csv'
- cohortId        → Set to None for now (not in CSV)

Mapped to Launchpad table:
- Student              → isStudent (Yes/No → bool)
- Work Experience      → workExperience (Yes/No → bool)
- Study Stream         → studyStream
- Expected Outcomes    → expectedOutcomes
- Coding Familiarity   → codingFamiliarity
- Python Familiarity   → pythonFamiliarity
- Languages            → languages
- Years of Experience  → yearsOfExperience

Ignored Fields (not mapped or stored):
- Birthday, Outside India, Address, Pincode, Picture, Stable Diffusion

TODOs:
- Extend support for cohortId if chosen via UI/upload mapping in future.
- Optionally create new Profile table to store unmapped data if needed.

Configurable Upload Modes:
- FILE_SOURCE_MODE = "local" or "blob" (currently only 'local' supported)

"""


async def process_bulk_csv(path: str, file_source: str = "local"):
    if file_source != "local":
        return {"status": "failure", "reason": "Unsupported file source type", "file_source": file_source}

    try:
        df = pd.read_csv(path)
    except FileNotFoundError:
        return {"status": "failure", "reason": f"File not found: {path}"}
    except Exception as e:
        return {"status": "failure", "reason": f"Error reading file: {str(e)}"}

    db = DBConnection()
    await db.connect()

    if not db.connected:
        return {"status": "failure", "reason": "DB connection failed"}

    results = []
    for _, row in df.iterrows():
        row_data = row.to_dict()
        result = await db.insert_user_from_row(row_data)
        results.append(result)

    summary = {
        "status": "success",
        "source": path,
        "total": len(results),
        "success_count": sum(1 for r in results if r["status"] == "success"),
        "skipped_count": sum(1 for r in results if r["status"] == "skipped"),
        "failure_count": sum(1 for r in results if r["status"] == "failure"),
        "results": results,
    }

    return summary

if __name__ == "__main__":
    # ✅ Run the function with your specific file
    csv_path = "./Diversified_Mock_Entries.csv"  # ⬅️ Your actual CSV path
    result = asyncio.run(process_bulk_csv(csv_path, file_source="local"))
    print(result)
