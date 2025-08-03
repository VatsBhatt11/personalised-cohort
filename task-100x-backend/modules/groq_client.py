import os
from groq import Groq

async def generate_personalized_message(context: dict) -> str:
    client = Groq(
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    system_prompt = """
    You are a learning motivation expert that creates hyper-personalized notification messages to increase student engagement and session attendance. Your goal is to connect upcoming learning sessions directly to the student's personal goals and interests.

    CONTEXT YOU HAVE ACCESS TO:
    - Student's background (education, experience, current role)
    - Student's interests and passions
    - Student's future goals and aspirations
    - Upcoming session title and description

    YOUR TASK:
    Generate a single, compelling notification message that:
    1. Directly connects the upcoming session topic to their specific future goals
    2. Shows clear, practical applications relevant to their interests
    3. Creates curiosity and urgency about missing out
    4. Uses their background context to make it personally relevant
    5. Focuses on "what's in it for them" rather than generic benefits

    MESSAGE REQUIREMENTS:
    - Length: 25-40 words maximum
    - Tone: Conversational, motivating, slightly urgent
    - Format: Direct message only (no greetings, signatures, or meta-text)
    - Perspective: Second person ("You", "Your")
    - Include one specific, relevant application or outcome
    - End with either a question or action-oriented statement

    AVOID:
    - Generic phrases like "enhance your skills" or "boost your career"
    - Formal language or corporate jargon
    - Multiple exclamation marks or excessive enthusiasm
    - Mentioning the platform name or course structure
    - Starting with "Here's your message" or similar meta-text

    OUTPUT FORMAT:
    Provide only the notification message, nothing else.
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
        model="llama3-8b-8192", # Using a suitable Groq model
        temperature=0.7,
        max_tokens=100, # Adjust max_tokens to fit message length requirements
    )

    response_content = chat_completion.choices[0].message.content
    print(f"Groq API raw response: {response_content}") # Log the raw response
    
    # Extract JSON from markdown code block if present
    if '```json' in response_content:
        json_start = response_content.find('{')
        json_end = response_content.rfind('}')
        if json_start != -1 and json_end != -1:
            return response_content[json_start:json_end+1]
    
    return response_content

async def generate_quiz_from_transcription(transcription: str) -> dict:
    client = Groq(
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    system_prompt = """
    You are an AI assistant specialized in generating quizzes from session transcriptions.
    Your task is to create a quiz in a specific JSON format based on the provided transcription.

    The quiz should consist of multiple-choice questions (MCQ), true/false questions, and short answer questions.
    Each question should have a 'questionText', 'questionType', and 'options' (for MCQ and True/False).
    For MCQ and True/False questions, each option should have 'optionText' and 'isCorrect' (boolean).
    For short answer questions, the 'options' array should be empty.

    The output MUST be a JSON object with a single key 'questions', which is an array of question objects.

    Example JSON format:
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
            },
            {
                "questionText": "The Earth is flat.",
                "questionType": "TRUE_FALSE",
                "options": [
                    {"optionText": "True", "isCorrect": false},
                    {"optionText": "False", "isCorrect": true}
                ]
            },
            {
                "questionText": "What is the main purpose of a 'for' loop in programming?",
                "questionType": "SHORT_ANSWER",
                "options": []
            }
        ]
    }

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
        model="llama3-8b-8192", # Using a suitable Groq model
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