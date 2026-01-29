import json
import os

def extract_stories():
    file_path = r"c:\Users\david\Desktop\RANDOM\STORY_KIDS\seed\stories.seed.json"
    output_path = r"c:\Users\david\Desktop\RANDOM\STORY_KIDS\extracted_stories.txt"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        stories = json.load(f)
        
    with open(output_path, 'w', encoding='utf-8') as out:
        for story in stories:
            title = story.get('locales', {}).get('en', {}).get('title', 'Unknown Title')
            text = story.get('locales', {}).get('en', {}).get('text', '')
            
            # Simple pagination logic matching the TS code
            # Split by sentences (., !, ?)
            import re
            sentences = re.split(r'([^.!?]+[.!?]+)', text)
            # re.split with capturing group returns the separators too, so we need to join them
            real_sentences = []
            for i in range(0, len(sentences)-1, 2):
                real_sentences.append(sentences[i] + sentences[i+1])
            if len(sentences) % 2 != 0 and sentences[-1].strip():
                real_sentences.append(sentences[-1])
                
            pages = []
            current_page = ""
            
            for sentence in real_sentences:
                trimmed = sentence.strip()
                if not trimmed: continue
                
                if len(current_page) + len(trimmed) > 150 and len(current_page) > 0:
                    pages.append(current_page.strip())
                    current_page = trimmed
                else:
                    current_page += (" " if current_page else "") + trimmed
            
            if current_page.strip():
                pages.append(current_page.strip())
                
            if not pages:
                pages = ["..."]

            out.write(f"BOOK: {title}\n")
            out.write(f"ID: {story.get('storyKey', 'unknown')}\n")
            out.write("PAGES:\n")
            for i, page in enumerate(pages):
                out.write(f"Page {i+1}: {page}\n")
            out.write("-" * 30 + "\n")

if __name__ == "__main__":
    extract_stories()
