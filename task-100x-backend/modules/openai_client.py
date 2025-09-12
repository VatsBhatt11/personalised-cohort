import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_personalized_message_openai(context: dict) -> str:
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
    Generate exactly TWO clear, outcome-focused points where:
    1) A plain-English explanation of the lecture topic (why it matters in general).
    2) A link between that topic and the mentee’s stated **Expected Outcomes**, phrased in terms of the bigger picture
    (career, projects, business, or exploration). Do not directly say “your goal is…”. Instead, imply relevance by showing how 
    the topic contributes to that type of outcome. If relevant, also connect to their background (education/work/experience) to make it
    feel personal that show how this lecture will help the mentee reach their **Expected Outcomes**.  
    
    
    WRITING RULES:
    - Directly relate each point to the mentee’s Expected Outcomes.
    - Keep it simple and encouraging, like you’re talking to a friend.  
    - Each point = 1–2 lines max.  
    - Use “you” language (e.g., “you’ll be able to…”).  
    - Avoid generic or vague benefits — always ground in their goals and the session’s content.  
    - Avoid jargon unless the outcome clearly references advanced concepts.
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