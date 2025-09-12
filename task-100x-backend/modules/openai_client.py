import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_personalized_message_openai(context: dict) -> str:
    system_prompt = """
    You are a mentor who creates meaningful bridges between lecture content and student aspirations.
    
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
    Generate exactly TWO clear points where:
    Pointer-1 contains: A plain-English explanation of the lecture topic and the specific skill/knowledge they'll gain.
    For eg: For session title 'Intro to API', "Pointer 1: You'll learn how APIs work as communication channels between different software systems."
    
    Pointer-2 contains: A specific mechanism showing HOW this skill enables progress toward their Expected Outcomes. 
    Focus on the pathway/bridge between the skill and their goal, not just that it helps. Avoid reusing exact words 
    from their Expected Outcomes. Instead, explain the underlying capability this skill provides in their target domain.
    For eg: For Outcome "Build in B2B SaaS space" + API session:
    "Pointer 2: This integration knowledge lets you connect multiple business tools, creating the interconnected workflows companies need."
    
    BRIDGE-BUILDING RULES:
    DO:
    - Identify specific mechanisms between skill and goal
    - Reference concrete applications in their target domain  
    - Use action-oriented language ("enables you to...", "gives you the foundation to...")
    - Connect to their background when it strengthens the bridge
    
    DON'T:
    - Reuse exact words/phrases from Expected Outcomes
    - Make obvious statements ("this will help achieve your goals")
    - Be generic about the connection
    - Simply state the skill is useful for their field
    
    WRITING RULES:
    - Keep it simple and encouraging, like talking to a friend
    - Each point = 1–2 lines max, 15-20 words each
    - Use "you" language consistently
    - Ground connections in specific, actionable capabilities
    - Match technical depth to their skill level
    
    OUTPUT:
    Two concise bullet points, each 15-20 words, labeled as 'Pointer 1:' and 'Pointer 2:', no extra text.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    """

    try:
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
            model="gpt-4o-mini",  # Or "gpt-4" or "gpt-4-turbo" based on your preference
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
    except Exception as e:
        print(f"Error generating personalized message with OpenAI: {e}")
        return ""