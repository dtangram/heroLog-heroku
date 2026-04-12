from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import psycopg2
import os
from dotenv import load_dotenv
import anthropic
import json

load_dotenv()

app = FastAPI()

@app.get("/enrich-and-store/{user_id}")
def enrich_and_store(user_id: str):
    try:
        # Fetch comics from Heroku database
        heroku_conn = get_heroku_db_connection()
        heroku_cursor = heroku_conn.cursor()
        heroku_cursor.execute("""
            SELECT 
                cb.id,
                cb.title,
                cb.author,
                cb.penciler,
                cb.year,
                cb."comicIssue",
                cb.volume,
                cbt."cbTitle"
            FROM "ComicBooks" cb
            JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
            JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
            JOIN "Users" u ON cp."collectpubUsersId" = u.id
            WHERE u.id = %s
            LIMIT 10;
        """, (user_id,))
        comics = heroku_cursor.fetchall()
        heroku_cursor.close()
        heroku_conn.close()

        # Initialize Anthropic client
        client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

        # Connect to Stackhero database
        vector_conn = get_db_connection()
        vector_cursor = vector_conn.cursor()

        stored = []

        for comic in comics:
            comic_id, title, author, penciler, year, issue, volume, series = comic

            # Generate description using Claude
            prompt = f"""
            Generate a rich, detailed description for this comic book that captures its themes, tone, era, and significance.
            
            Comic Details:
            - Series: {series}
            - Title: {title}
            - Issue: #{issue}
            - Volume: {volume}
            - Year: {year if year else 'Unknown'}
            - Author: {author if author else 'Unknown'}
            - Penciler: {penciler if penciler else 'Unknown'}
            
            Write 2-3 sentences describing the tone, themes, era, and what makes this comic notable.
            Focus on information that would help someone find this comic through a search like 
            "dark 90s Batman" or "classic detective stories".
            Return only the description, no additional text.
            """

            message = client.messages.create(
                model="claude-opus-4-5",
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            description = message.content[0].text

            # Store in Stackhero database without embedding for now
            vector_cursor.execute("""
                INSERT INTO comic_embeddings 
                    (comic_id, user_id, title, description)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                str(comic_id),
                user_id,
                f"{series} #{issue}",
                description
            ))

            stored.append({
                "comic_id": str(comic_id),
                "title": f"{series} #{issue}",
                "description": description
            })

        vector_conn.commit()
        vector_cursor.close()
        vector_conn.close()

        return {
            "status": "Success",
            "stored_count": len(stored),
            "comics": stored
        }

    except Exception as e:
        return {"status": "Failed", "error": str(e)}

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv("STACKHERO_POSTGRESQL_HOST"),
        port=os.getenv("STACKHERO_POSTGRESQL_PORT"),
        user="admin",
        password=os.getenv("STACKHERO_POSTGRESQL_ADMIN_PASSWORD"),
        database="admin",
        sslmode="require"
    )
    return conn

def get_heroku_db_connection():
    conn = psycopg2.connect(
        os.getenv("DATABASE_URL"),
        sslmode="require"
    )
    return conn

# Test route
@app.get("/")
def read_root():
    return {"status": "Hero Log AI Service is running"}

@app.get("/create-table")
def create_table():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Enable pgvector extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        # Create the table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comic_embeddings (
                id SERIAL PRIMARY KEY,
                comic_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                description TEXT,
                embedding vector(1536),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "Table created successfully"}
    except Exception as e:
        return {"status": "Failed", "error": str(e)}

@app.get("/verify-table")
def verify_table():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'comic_embeddings';
        """)
        columns = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "Success", "columns": columns}
    except Exception as e:
        return {"status": "Failed", "error": str(e)}

# Test database connection
@app.get("/test-db")
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "Database connected", "tables": tables}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

@app.get("/fetch-comics/{user_id}")
def fetch_comics(user_id: str):
    try:
        conn = get_heroku_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                cb.id,
                cb.title,
                cb.author,
                cb.penciler,
                cb.year,
                cb."comicIssue",
                cb.volume,
                cbt."cbTitle"
            FROM "ComicBooks" cb
            JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
            JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
            JOIN "Users" u ON cp."collectpubUsersId" = u.id
            WHERE u.id = %s
            LIMIT 10;
        """, (user_id,))
        comics = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "Success", "comics": comics}
    except Exception as e:
        return {"status": "Failed", "error": str(e)}

@app.get("/generate-embeddings/{user_id}")
def generate_embeddings(user_id: str):
    try:
        openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch comics without embeddings
        cursor.execute("""
            SELECT id, title, description
            FROM comic_embeddings
            WHERE user_id = %s
            AND embedding IS NULL;
        """, (user_id,))
        comics = cursor.fetchall()

        updated_count = 0

        for comic in comics:
            comic_id, title, description = comic

            # Generate embedding
            response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=description
            )

            embedding = response.data[0].embedding

            # Store embedding
            cursor.execute("""
                UPDATE comic_embeddings
                SET embedding = %s
                WHERE id = %s;
            """, (embedding, comic_id))

            updated_count += 1

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "status": "Success",
            "embeddings_generated": updated_count
        }

    except Exception as e:
        return {"status": "Failed", "error": str(e)}

@app.get("/search/{user_id}")
def search_comics(user_id: str, q: str):
    try:
        openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

        # Generate embedding for the search query
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=q
        )
        query_embedding = response.data[0].embedding

        # Search for similar comics
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                comic_id,
                title,
                description,
                1 - (embedding <=> %s::vector) as similarity
            FROM comic_embeddings
            WHERE user_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT 5;
        """, (query_embedding, user_id, query_embedding))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        formatted_results = []
        for result in results:
            comic_id, title, description, similarity = result
            formatted_results.append({
                "comic_id": comic_id,
                "title": title,
                "description": description,
                "similarity_score": round(float(similarity), 4)
            })

        return {
            "status": "Success",
            "query": q,
            "results": formatted_results
        }

    except Exception as e:
        return {"status": "Failed", "error": str(e)}

@app.get("/search-all")
def search_all_comics(q: str):
    try:
        client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

        message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": f"""You are a comic book expert. A user is searching for: "{q}"

    Return ONLY a JSON array with no other text, no markdown, no backticks, no explanation.
    Just the raw JSON array starting with [ and ending with ]

    Each item must have exactly these fields:
    - title: series name and issue number
    - description: 2-3 sentences about tone, themes, era and significance
    - publisher: publisher name
    - year: publication year as a string

    Example of exact format to return:
    [{{"title": "Batman #497", "description": "A dark psychological thriller.", "publisher": "DC Comics", "year": "1993"}}]"""
            }
        ]
    )
        raw_text = message.content[0].text.strip()

        # Strip markdown code blocks if Claude adds them
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        results = json.loads(raw_text)

        formatted_results = []
        for result in results:
            formatted_results.append({
                "title": result.get("title", ""),
                "description": result.get("description", ""),
                "publisher": result.get("publisher", ""),
                "year": result.get("year", ""),
                "source": "claude"
            })

        return {
            "status": "Success",
            "query": q,
            "results": formatted_results
        }

    except Exception as e:
        return {"status": "Failed", "error": str(e)}


@app.get("/search-missing/{user_id}")
def search_missing_comics(user_id: str, q: str):
    try:
        client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

        # First get all comics Claude knows about matching the query
        message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": f"""You are a comic book expert. A user is searching for: "{q}"

    Return ONLY a JSON array with no other text, no markdown, no backticks, no explanation.
    Just the raw JSON array starting with [ and ending with ]

    Each item must have exactly these fields:
    - title: series name and issue number
    - description: 2-3 sentences about tone, themes, era and significance
    - publisher: publisher name
    - year: publication year as a string

    Example of exact format to return:
    [{{"title": "Batman #497", "description": "A dark psychological thriller.", "publisher": "DC Comics", "year": "1993"}}]"""
            }
        ]
    )

        raw_text = message.content[0].text.strip()

        # Strip markdown code blocks if Claude adds them
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        all_results = json.loads(raw_text)

        # Get user's existing collection titles
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT LOWER(title) FROM comic_embeddings
            WHERE user_id = %s;
        """, (user_id,))
        owned_titles = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()

        # Filter out comics the user already owns
        missing_results = []
        for result in all_results:
            title_lower = result.get("title", "").lower()
            already_owned = any(owned in title_lower or title_lower in owned for owned in owned_titles)
            missing_results.append({
                "title": result.get("title", ""),
                "description": result.get("description", ""),
                "publisher": result.get("publisher", ""),
                "year": result.get("year", ""),
                "already_owned": already_owned,
                "source": "claude"
            })

        return {
            "status": "Success",
            "query": q,
            "results": missing_results
        }

    except Exception as e:
        return {"status": "Failed", "error": str(e)}