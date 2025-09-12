import os
from groq import Groq

async def generate_personalized_message(context: dict) -> str:
    client = Groq(
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    system_prompt = """
    You are a mentor’s voice who helps mentees clearly see how each lecture moves them closer to their personal goals.  
    
    TEMPLATE CONTEXT:
    Message format:
    - {message_content_point_1}
    - {message_content_point_2}
    
    AVAILABLE CONTEXT:
    - Education: Student's study stream/field
    - Work Experience: Their professional background  
    - Years of Experience: Career duration
    - Coding Familiarity: Their coding skill level
    - Python Familiarity: Python-specific experience
    - Programming Languages: Languages they know
    - Expected Outcomes: What they want to achieve from the program
    - Session Title: Upcoming session name
    - Session Description: What the session covers
    
    YOUR TASK:
    Generate exactly TWO clear, outcome-focused points that show how this lecture will help the mentee reach their **Expected Outcomes**.  
    If relevant, also connect to their background (education/work/experience) to make it feel personal.  
    
    WRITING RULES:
    - Directly relate each point to the mentee’s Expected Outcomes.
    - Keep it simple and encouraging, like you’re talking to a friend.  
    - Each point = 1–2 lines max.  
    - Use “you” language (e.g., “you’ll be able to…”).  
    - Avoid generic or vague benefits — always ground in their goals and the session’s content.  
    - Skip technical jargon unless it matches their skill level.  
    
    EXAMPLES OF GOOD STYLE:
    - “You’ll learn how to structure prompts so your AI answers are sharp — a skill that directly supports your goal of building a personal assistant.”  
    - “You’ll see how to analyze data step by step, which connects to your aim of becoming confident in Python for your career shift.”  
    
    OUTPUT:
    Two concise bullet points, each between 15-20 words, clearly labeled as 'Pointer 1:' and 'Pointer 2:', no extra text.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_message,
            },
        ],
        model="llama-3.3-70b-versatile", # Using a suitable Groq model
        temperature=0.7,
        max_tokens=100, # Adjust max_tokens to fit message length requirements
    )

    response_content = chat_completion.choices[0].message.content
    print(f"Groq API raw response: {response_content}") # Log the raw response
    
    # Parse the two pointers from the response content
    pointers = {"pointer1": "", "pointer2": ""}
    lines = response_content.strip().split('\n')
    for line in lines:
        cleaned_line = line.lstrip('- ').strip() # Remove leading hyphen and space
        if cleaned_line.startswith('Pointer 1:'):
            pointers["pointer1"] = cleaned_line.replace('Pointer 1:', '').strip()
        elif cleaned_line.startswith('Pointer 2:'):
            pointers["pointer2"] = cleaned_line.replace('Pointer 2:', '').strip()

    return pointers

async def generate_quiz_from_transcription(transcription: str) -> dict:
    client = Groq(
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    system_prompt = """
    You are an AI assistant specialized in generating quizzes from session transcriptions.
    Your task is to create a quiz in a specific JSON format based on the provided transcription.

    The quiz should consist ONLY of multiple-choice questions (MCQ).
    Each question MUST have a 'questionText', 'questionType' (which MUST be 'MULTIPLE_CHOICE'), and 'options'.
    Each option MUST have 'optionText' and 'isCorrect' (boolean).

    The output MUST be a JSON object with a single key 'questions', which is an array of question objects.
    The entire response MUST be a single JSON object, not multiple concatenated JSON objects.

    Example JSON format:
    ```json
    {
        "questions": [
            {
                "questionText": "What is the capital of France?",
                "questionType": "MULTIPLE_CHOICE",
                "options": [
                    {"optionText": "Berlin", "isCorrect": false},
                    {"optionText": "Paris", "isCorrect": true},
                    {"optionText": "Rome", "isCorrect": false}
                ]
            }
        ]
    }
    ```

    Ensure the questions are relevant to the transcription and cover key concepts.
    """

    user_message = f"""
    Generate a quiz based on the following session transcription:

    {transcription}
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_message,
            },
        ],
        model="llama-3.3-70b-versatile", # Using a suitable Groq model
        temperature=0.7,
    )

    response_content = chat_completion.choices[0].message.content
    print(f"Groq API raw response: {response_content}") # Log the raw response
    
    # Extract JSON from markdown code block if present
    json_start = response_content.find('{')
    json_end = response_content.rfind('}')
    if json_start != -1 and json_end != -1:
        return response_content[json_start:json_end+1]
    
    return response_content