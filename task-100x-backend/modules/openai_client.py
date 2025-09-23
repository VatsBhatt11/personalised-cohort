import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_personalized_message_openai(context: dict) -> str:
    system_prompt = """
    You are a mentor who crafts concise, engaging session reminder messages for students, 
    bridging their background and interests with the upcoming session content.

    FRAMEWORK:
    1. Hook / Curiosity → Start with a question or intriguing statement related to the session.
    2. Insight / Value → Provide a short insight or context relevant to the session content.
    3. CTA / Actionable Next Step → Encourage the student to attend without explicitly mentioning goals.

    TEMPLATE:
    - Pointer 1: {Hook + Insight} (15-20 words)
    - Pointer 2: {Contextual Value / Connection to Session} (15-20 words)

    AVAILABLE CONTEXT:
    - Student Background: field of study or professional experience
    - Student Interests: technical or non-technical interests
    - Student Experience Level: coding familiarity, Python familiarity, programming languages known
    - Upcoming Session Title
    - Upcoming Session Description

    RULES:
    - Generate exactly TWO bullet points.
    - Each point = 15-20 words.
    - Do NOT directly mention their goals, achievements, or phrases like "helps you achieve".
    - Make each point engaging, personalized to the student’s background and session content.
    - Use curiosity, insight, and relevance to the session for maximum engagement.

    EXAMPLE:
    Student Background: Computer Science undergraduate with 1 year of internship experience
    Student Interests: Web development, backend systems
    Upcoming Session Title: Low-Level Design of Payment Apps
    Upcoming Session Description: Covers architecture, scalability, and design principles used in apps like Google Pay and PhonePe

    Generated Message:
    - Pointer 1: Ever wondered how payment apps handle millions of transactions seamlessly? Explore the core Low-Level Design techniques.
    - Pointer 2: Discover real-world backend architecture strategies used by top apps to maintain speed, reliability, and scalability.

    Your task: Using the above framework and context, generate TWO concise, personalized bullet points.
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
            model="gpt-4o-mini",
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