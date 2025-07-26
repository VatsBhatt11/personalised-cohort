import asyncio
from db_connector import DBConnection

test_row = {
    "Name": "Nandini Ray",
    "Email": "nandini.ray.22@iitkgp.ac.in",
    "PhoneNumber": "+91-9876543210",
    "Student": "Yes",
    "Work Experience": "No",
    "Study Stream": "Degree in AI/ML",
    "Expected Outcomes": "Contribute to open-source GenAI models and land PhD admit",
    "Coding Familiarity": "I’m familiar with coding",
    "Python Familiarity": "Intermediate",
    "Languages": "Python, C++, Julia",
    "Years of Experience": "1–3"
}

async def main_insert():
    db = DBConnection()
    await db.connect()

    if not db.connected:
        print("❌ Could not connect to DB.")
        print("Reason:", getattr(db, "_last_error", "Unknown"))
        return

    result = await db.insert_user_from_row(test_row)
    print("Insert result:", result)

async def main_get_user_details():
    db = DBConnection()
    await db.connect()

    user_id = "59bef906-0b20-49d9-b90f-d657d7ea4681"
    result = await db.get_user_details(user_id)
    print(result)


if __name__ == "__main__":
    # asyncio.run(main_insert())
    asyncio.run(main_get_user_details())
