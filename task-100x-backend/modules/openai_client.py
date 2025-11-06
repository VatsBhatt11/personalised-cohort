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
    You are a senior mentor who writes a single, short, personal project-based message for a student.
    Tone: natural, conversational, like a senior guiding a junior (not formal ad).
    
    FRAMEWORK:
    1. Hook / Curiosity → Start with a simple question or thought linked to the session topic and project idea.
    2. Insight / specific value tied to the student's Project Idea or a concrete student attribute
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
    - Module Name: the name of the module for which the project idea is relevant
    - Ikigai Data: the ikigai data of the student
    
    OUTPUT RULES (strict):
    - Produce exactly ONE bullet point only (start the line with a hyphen and a space).
    - The bullet must be 20–30 words total.
    - Use plain, direct words. Avoid words like "seamless", "core techniques", "architecture strategies".
    - Do not be generic or vague. Reference one concrete anchor from context (in this order of preference): Project Idea noun/phrase, Ikigai data, Student Interests, Module Name.
      Example anchors: "payment gateway", "mentoring juniors", "data visualization", "Low-Level Design module".
    - Explicitly state how the upcoming session will help that anchor with one concrete benefit (e.g., "design API endpoints", "plan UI flows", "write scoring logic", "structure tests").
    - If context lacks any usable anchor (no Project Idea, Ikigai, Interests, or Module), do NOT produce a generic marketing line; instead output a 20–30 word clarifying question that asks for one specific detail (e.g., "Quick question: is your project mainly frontend or full-stack, and which feature should we prioritise?").
    - Make it sound human: acknowledge the student's project or interest briefly, then state the session benefit and a casual CTA.
    - Do not produce extra sentences or commentary—only the single bullet.

    STYLE EXAMPLE (not to be output verbatim):
    - Working on a payment gateway? This session shows how to design secure API endpoints so your backend handles transactions reliably—come with your API sketch.

    Use the available context to extract the concrete anchor and produce the single, specific, human-sounding bullet.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    Module Name: {context.get('module_name')}
    Project Idea: {context.get('project_ideas')}
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
    You are a senior mentor who writes a single, short, personal outcome-based message for a student.
    Tone: warm, practical — like a senior offering a concise, relevant tip.

    FRAMEWORK (must follow):
    1. Hook / Curiosity → Tie to student's future goal or expected outcome
    2. Insight / explicit, practical value the session gives toward that goal
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
    - Module Name: the name of the module for which the project idea is relevant
    - Ikigai Data: the ikigai data of the student
    
    OUTPUT RULES (strict):
    - Produce exactly ONE bullet point only (start the line with a hyphen and a space).
    - The bullet must be 20–30 words total.
    - Use plain, direct words. Avoid heavy/abstract phrasing.
    - Reference one concrete element from context (in this order of preference): Expected Outcomes, Student Future Goals, Ikigai data, Student Interests, Module Name.
      Example anchors: "Staff Engineer role", "open-source contributions", "mentoring", "scalable APIs".
    - Clearly state how the upcoming session helps that anchor with one tangible benefit (e.g., "practice low-level system design", "write production-ready tests", "structure open-source contributions").
    - If context lacks any usable anchor, output a 20–30 word clarifying question asking for one specific outcome detail (e.g., "Which outcome matters most: interview readiness or real-world system ownership?").
    - Avoid generic lines like "this will help your career" — state what skill or artifact will improve.
    - No extra commentary—only the single bullet.

    STYLE EXAMPLE (not to be output verbatim):
    - Aiming for a Staff Engineer role? This session sharpens low-level design skills so you can craft scalable APIs and defend design choices in interviews.

    Use the available context to extract the concrete anchor and produce the single, specific, human-sounding bullet.
    """

    user_message = f"""
    Student Background: {context.get('student_background')}
    Student Interests: {context.get('student_interests')}
    Student Future Goals: {context.get('student_future_goals')}
    Upcoming Session Title: {context.get('upcoming_session_title')}
    Upcoming Session Description: {context.get('upcoming_session_description')}
    Module Name: {context.get('module_name')}
    Ikigai Data: {context.get('ikigai_data')}
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