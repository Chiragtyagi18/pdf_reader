from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
import io
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(title="PDF Reader API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

def get_pdf_text(pdf_file):
    """Extract text from uploaded PDF file"""
    text = ""
    pdf_reader = PdfReader(pdf_file)
    for page in pdf_reader.pages:
        text += page.extract_text() or ""
    return text

def get_text_chunks(text):
    """Split text into chunks for processing"""
    text_splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", " ", ""],
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.create_documents([text])
    return chunks

def get_vectorstore(text_chunks):
    """Create and save vector store from text chunks"""
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    vectorstore = FAISS.from_documents(text_chunks, embeddings)
    vectorstore.save_local("faiss_index")
    return len(text_chunks)

def format_docs(docs):
    """Format documents for context"""
    return "\n\n".join(doc.page_content for doc in docs)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "PDF Reader API is running", "status": "healthy"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        
        # Extract text from PDF
        text = get_pdf_text(pdf_file)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Create text chunks and vector store
        chunks = get_text_chunks(text)
        num_chunks = get_vectorstore(chunks)
        
        return {
            "message": "PDF processed successfully",
            "filename": file.filename,
            "chunks": num_chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    """Ask a question about the uploaded PDF"""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        # Check if vector store exists
        if not os.path.exists("faiss_index"):
            raise HTTPException(status_code=400, detail="Please upload a PDF first")
        
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        db = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
        docs = db.similarity_search(request.question)
        
        # Create prompt and chain
        prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant for answering questions based on the provided context. Use the following pieces of context to answer the question at the end. If you don't know the answer, say you don't know. Always use all available information to provide the best answer possible.

Context:
{context}

Question: {question}

Answer:""")
        
        model = ChatGoogleGenerativeAI(model="models/gemini-3.1-flash-lite-preview", temperature=0.3)
        
        chain = prompt | model | StrOutputParser()
        
        response = chain.invoke({
            "context": format_docs(docs),
            "question": request.question
        })
        
        return {"answer": response}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))