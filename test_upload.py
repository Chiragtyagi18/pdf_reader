import requests
import os
import io

# Check if backend is running
try:
    response = requests.get("http://localhost:8000/")
    print("✅ Backend is running:", response.json())
except Exception as e:
    print("❌ Backend is not running:", str(e))
    exit(1)

print("\n" + "="*60)
print("TESTING PDF UPLOAD ENDPOINT")
print("="*60)

# Create a simple test PDF content
test_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for Chirag - Skills: Python, AI) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
306
%%EOF"""

# Test upload
print("\n📤 Testing file upload...")
files = {'file': ('test_resume.pdf', io.BytesIO(test_pdf_content), 'application/pdf')}

try:
    response = requests.post("http://localhost:8000/upload", files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("\n✅ Upload successful!")
        
        # Test asking a question
        print("\n💬 Testing question endpoint...")
        question_response = requests.post(
            "http://localhost:8000/ask",
            json={"question": "What are the skills mentioned in the document?"}
        )
        print(f"Status Code: {question_response.status_code}")
        print(f"Answer: {question_response.json()}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "="*60)
print("If the above test worked, your backend is functioning correctly!")
print("Now try uploading a PDF through the web interface.")
print("="*60)

