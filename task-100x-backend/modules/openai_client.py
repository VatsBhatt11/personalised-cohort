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
    
    Pointer-2 contains: An INDIRECT connection showing how this skill creates opportunities or capabilities relevant to their Expected Outcomes. 
    Don't explicitly mention their goals or use direct phrases like "helps you achieve" or "supports your goal of". Instead, describe 
    the broader capability or opportunity this skill opens up in their target domain.
    
    REFERENCE EXAMPLE:
    **Lecture Topic:** Introduction to API 
    **Mentee Outcome:** Build in the B2B SaaS space.
    - Pointer 1: You'll see how APIs act as bridges, letting tools and apps work together.
    - Pointer 2: Strong integrations are what make SaaS products scalable and essential for businesses. 
    
    BRIDGE-BUILDING RULES:
    DO:
    - Make connections through implication and context
    - Focus on the broader capability the skill provides
    - Describe opportunities or doors this knowledge opens
    - Reference what becomes possible with this skill
    - Use indirect language that implies relevance
    
    DON'T:
    - Directly reference their stated goals
    - Use phrases like "this will help you achieve", "supports your goal of", "connects to your aim"
    - Reuse exact words/phrases from Expected Outcomes
    - Make the connection overly obvious or direct
    - Simply state the skill is useful for their field
    
    WRITING RULES:
    - Keep it simple and encouraging, like talking to a friend
    - Each point = 1–2 lines max, 15-20 words each
    - Use "you" language consistently
    - Make connections feel natural and conversational
    - Match technical depth to their skill level
    - Let the relevance be implied rather than stated
    
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