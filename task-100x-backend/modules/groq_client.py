import os
from groq import Groq

async def generate_personalized_message(context: dict) -> str:
    client = Groq(
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    # system_prompt = """
    # You are a learning motivation expert that creates hyper-personalized notification messages to increase student engagement and session attendance.
    # Your goal is to connect upcoming learning sessions directly to the student's personal goals and interests.

    # CONTEXT YOU HAVE ACCESS TO:
    # - Student's background (education, experience, current role)
    # - Student's interests and passions
    # - Student's future goals and aspirations
    # - Upcoming session title and description

    # YOUR TASK:
    # Generate a single, compelling notification message that:
    # 1. Directly connects the upcoming session topic to their specific future goals
    # 2. Shows clear, practical applications relevant to their interests
    # 3. Creates curiosity and urgency about missing out
    # 4. Uses their background context to make it personally relevant
    # 5. Focuses on "what's in it for them" rather than generic benefits

    # MESSAGE REQUIREMENTS:
    # - Length: 25-40 words maximum
    # - Tone: Conversational, motivating, slightly urgent
    # - Format: Direct message only (no greetings, signatures, or meta-text)
    # - Perspective: Second person ("You", "Your")
    # - Include one specific, relevant application or outcome
    # - End with either a question or action-oriented statement

    # AVOID:
    # - Generic phrases like "enhance your skills" or "boost your career"
    # - Formal language or corporate jargon
    # - Multiple exclamation marks or excessive enthusiasm
    # - Mentioning the platform name or course structure
    # - Starting with "Here's your message" or similar meta-text

    # OUTPUT FORMAT:
    # Provide only the notification message, nothing else.
    # """

    system_prompt = """
    You are a learning motivation expert and storyteller that creates hyper-personalized notification messages using narrative techniques to increase student engagement and session attendance.

    TEMPLATE CONTEXT:
    The message will be inserted into: "Hey {name} In this session you'll be learning {message_content} Team100x."
    You are generating ONLY the {message_content} part.

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
    Create a compelling story-driven message that makes the session feel like a personal mission they must complete.

    STORYTELLING APPROACH:
    1. **Set the Scene**: Reference their current situation (study stream, work background, experience level)
    2. **Introduce the Challenge**: Connect session content to a real problem they face
    3. **Present the Solution**: Show how this session is their next stepping stone
    4. **Paint the Future**: Describe the specific outcome they'll achieve
    5. **Create Urgency**: Make it feel like a crucial next step in their journey

    MESSAGE STRUCTURE:
    - Start with their current context/background
    - Introduce the session as the solution to their specific challenge
    - Use narrative elements like "imagine when..." or "picture this..."
    - Include concrete examples relevant to their experience level
    - End with the transformation they'll experience
    - Make it feel like a personal quest, not just learning

    PERSONALIZATION TECHNIQUES:
    - For beginners: "From zero to hero" narrative arc
    - For experienced: "Level up" or "breakthrough moment" stories  
    - Connect their study stream to real-world applications
    - Reference their programming languages for technical credibility
    - Align story outcome with their expected outcomes

    TONE: Conversational storytelling, motivational, personal journey focused with human touch most casual tone

    AVOID:
    - Generic educational language
    - Boring feature lists
    - Impersonal technical descriptions
    - Abstract benefits without concrete scenarios

    OUTPUT FORMAT:
    Provide only the story-based message content for {message_content} placeholder, nothing else.
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