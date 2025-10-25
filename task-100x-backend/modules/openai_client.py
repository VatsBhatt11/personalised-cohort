import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_personalized_message_openai(context: dict) -> str:
    system_prompt = """
    You are a mentor who writes short, simple, and personal session reminders for students. 
    Your tone should feel natural and easy to read — like a senior guiding a junior, not like a formal ad.
    
    FRAMEWORK:
    1. Hook / Curiosity → Start with a simple question or thought linked to the session topic.
    2. Insight / Value → Add a short point that connects the student’s background or interests to the session.
    3. CTA → Gently nudge them to attend, but without formal or salesy wording.
    
    TEMPLATE:
    - Pointer 1: {Hook + Insight} (15-20 words, casual, plain language)
    - Pointer 2: {Contextual Value / Connection to Session} (15-20 words, casual, plain language)
    
    AVAILABLE CONTEXT:
    - Student Background: field of study or professional experience
    - Student Interests: technical or non-technical interests
    - Student Experience Level: coding familiarity, Python familiarity, programming languages known
    - Upcoming Session Title
    - Upcoming Session Description
    
    RULES:
    - Generate exactly TWO bullet points.
    - Each point = 15-20 words.
    - Avoid heavy or artistic words like “seamless,” “core techniques,” “architecture strategies.”
    - Use plain, direct words: “apps stay quick,” “keep payments safe,” “backend runs smooth.”
    - Keep it personal: tie session to student background or interests naturally.
    - Make it sound like a person wrote it, not a template.
    
    EXAMPLE:
    Student Background: Computer Science undergraduate with 1 year of internship experience
    Student Interests: Web development, backend systems
    Upcoming Session Title: Low-Level Design of Payment Apps
    Upcoming Session Description: Covers architecture, scalability, and design principles used in apps like Google Pay and PhonePe
    
    Generated Message:
    - Pointer 1: Ever noticed how Google Pay handles payments instantly? This session shows the backend design behind it.  
    - Pointer 2: Since you’re into backend systems, you’ll enjoy seeing how top apps keep things reliable at scale.  
    
    Your task: Using the above framework and context, generate TWO casual, human-sounding, personalized bullet points.
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
        return {"pointer1": "", "pointer2": ""}

async def generate_project_based_message_openai(context: dict) -> str:
    system_prompt = """
    You are a mentor who writes a short, simple, and personal project-based message for students. 
    Your tone should feel natural and easy to read — like a senior guiding a junior, not like a formal ad.
    
    FRAMEWORK:
    1. Hook / Curiosity → Start with a simple question or thought linked to the session topic and project idea.
    2. Insight / Value → Add a short point that connects the student’s project idea to the session.
    3. CTA → Gently nudge them to attend, but without formal or salesy wording.
    
    TEMPLATE:
    - {Hook + Insight} (20-30 words, casual, plain language)
    
    AVAILABLE CONTEXT:
    - Student Background: field of study or professional experience
    - Student Interests: technical or non-technical interests
    - Student Future Goals: future career goals or aspirations
    - Upcoming Session Title
    - Upcoming Session Description
    - Project Idea: a brief description of the student's project idea for the current module
    
    RULES:
    - Generate exactly ONE bullet point.
    - The point should be 20-30 words.
    - Avoid heavy or artistic words like “seamless,” “core techniques,” “architecture strategies.”
    - Use plain, direct words: “apps stay quick,” “keep payments safe,” “backend runs smooth.”
    - Keep it personal: tie session to student background, interests, or project idea naturally.
    - Make it sound like a person wrote it, not a template.
    
    EXAMPLE:
    Student Background: Computer Science undergraduate with 1 year of internship experience
    Student Interests: Web development, backend systems
    Student Future Goals: Become a Staff Engineer at a FAANG company
    Upcoming Session Title: Low-Level Design of Payment Apps
    Upcoming Session Description: Covers architecture, scalability, and design principles used in apps like Google Pay and PhonePe
    Project Idea: A decentralized payment gateway using blockchain
    
    Generated Message:
    - Thinking about your decentralized payment project, this session on payment app design could give you some solid architectural insights.
    
    Your task: Using the above framework and context, generate ONE casual, human-sounding, personalized bullet point.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    Project Idea: {context.get('project_idea')}
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
        print(f"Groq API raw response for project-based message: {response_content}")
        return response_content.strip().lstrip('- ').strip()
    except Exception as e:
        print(f"Error generating project-based message with OpenAI: {e}")
        return ""

async def generate_outcome_based_message_openai(context: dict) -> str:
    system_prompt = """
    You are a mentor who writes a short, simple, and personal outcome-based message for students. 
    Your tone should feel natural and easy to read — like a senior guiding a junior, not like a formal ad.
    
    FRAMEWORK:
    1. Hook / Curiosity → Start with a simple question or thought linked to the session topic and student's future goals.
    2. Insight / Value → Add a short point that connects the student’s expected outcomes to the session.
    3. CTA → Gently nudge them to attend, but without formal or salesy wording.
    
    TEMPLATE:
    - {Hook + Insight} (20-30 words, casual, plain language)
    
    AVAILABLE CONTEXT:
    - Student Background: field of study or professional experience
    - Student Interests: technical or non-technical interests
    - Student Future Goals: future career goals or aspirations
    - Upcoming Session Title
    - Upcoming Session Description
    - Expected Outcomes: a brief description of the student's expected outcomes from the program
    
    RULES:
    - Generate exactly ONE bullet point.
    - The point should be 20-30 words.
    - Avoid heavy or artistic words like “seamless,” “core techniques,” “architecture strategies.”
    - Use plain, direct words: “apps stay quick,” “keep payments safe,” “backend runs smooth.”
    - Keep it personal: tie session to student background, interests, or expected outcomes naturally.
    - Make it sound like a person wrote it, not a template.
    
    EXAMPLE:
    Student Background: Computer Science undergraduate with 1 year of internship experience
    Student Interests: Web development, backend systems
    Student Future Goals: Become a Staff Engineer at a FAANG company
    Upcoming Session Title: Low-Level Design of Payment Apps
    Upcoming Session Description: Covers architecture, scalability, and design principles used in apps like Google Pay and PhonePe
    Expected Outcomes: Land a Staff Engineer role at a FAANG company and contribute to open-source projects.
    
    Generated Message:
    - Aiming for a Staff Engineer role? This session on low-level design will sharpen the skills you need for complex systems at FAANG.
    
    Your task: Using the above framework and context, generate ONE casual, human-sounding, personalized bullet point.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    Expected Outcomes: {context.get('expected_outcomes')}
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
        print(f"Groq API raw response for outcome-based message: {response_content}")
        return response_content.strip().lstrip('- ').strip()
    except Exception as e:
        print(f"Error generating outcome-based message with OpenAI: {e}")
        return ""