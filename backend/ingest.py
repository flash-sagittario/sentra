import csv
import os
from dotenv import load_dotenv
from google import genai
from supabase import create_client
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

def load_doc(path):
    # PDF only (Scoping Document FR-8). Other formats are future work.
    if not path.lower().endswith(".pdf"):
        raise ValueError("only PDF files are supported (FR-8)")
    reader = PdfReader(path)
    return [page.extract_text() or "" for page in reader.pages]

def embed_chunk(text):
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": 768}
    )
    return result.embeddings[0].values

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
manifest = list(csv.DictReader(open("corpus_manifest.csv")))

for row in manifest:
    filename = row["filename"]
    role = row["department"]
    filepath = f"corpus/{filename}"

    # Skip if this file was already ingested in a previous run
    existing = supabase.table("documents").select("id").eq("filename", filename).execute()
    if existing.data:
        print(f"Skipping {filename} (already ingested)")
        continue

    print(f"Processing {filename} (role={role})...")

    # Load the file; on failure, log and move on instead of crashing the whole run
    try:
        pages = load_doc(filepath)
    except Exception as e:
        print(f"  !! FAILED to load {filename}: {e}")
        continue

    full_text = "\n".join(pages)

    # Insert the document row, capture the generated id
    doc_insert = supabase.table("documents").insert({
        "filename": filename,
        "role": role
    }).execute()
    document_id = doc_insert.data[0]["id"]

    # Chunk and embed
    chunks = splitter.split_text(full_text)
    for chunk_text in chunks:
        vector = embed_chunk(chunk_text)
        supabase.table("chunks").insert({
            "document_id": document_id,
            "filename": filename,
            "content": chunk_text,
            "role": role,
            "embedding": vector
        }).execute()

    print(f"  -> {len(chunks)} chunks inserted")

print("Done.")
