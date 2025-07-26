# test/test_db_connector.py
import pytest
from db_connector import DBConnection

# Sample test row (you can parameterize more later)
test_row = {
    "Name": "Ishita Ray",
    "Email": "ishita.ray.22@iitkgp.ac.in",
    "Student": "Yes",
    "Work Experience": "No",
    "Study Stream": "Dual Degree in EE + AI/ML",
    "Expected Outcomes": "Contribute to open-source GenAI models and land PhD admit",
    "Coding Familiarity": "I’m familiar with coding",
    "Python Familiarity": "Intermediate",
    "Languages": "Python, C++, Julia",
    "Years of Experience": "1–3",
    "PhoneNumber": "1234567890"  # Optional field test
}

@pytest.mark.asyncio
async def test_insert_user():
    db = DBConnection()
    await db.connect()

    if not db.connected:
        pytest.fail("DB connection failed: " + getattr(db, "_last_error", "Unknown"))

    result = await db.insert_user_from_row(test_row)
    assert result["status"] in ["success", "skipped"], result
    assert result["email"] == test_row["Email"]


@pytest.mark.asyncio
async def test_get_user_details():
    db = DBConnection()
    await db.connect()

    user_id = "59bef906-0b20-49d9-b90f-d657d7ea4681"
    result = await db.get_user_details(user_id)
    assert result["status"] == "success"
    assert result["user_id"] == user_id
    assert "user" in result["data"]
