import os
import yt_dlp
import asyncio
import uuid
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn

app = FastAPI()

# 1. 이 부분을 수정했습니다! (Vercel 주소 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tube-audio-mp-3-three.vercel.app"  # 경헌님의 Vercel 주소 추가
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

progress_store = {}

def progress_hook(d):
    url = d.get('info_dict', {}).get('webpage_url', 'unknown')
    if d['status'] == 'downloading':
        p_str = d.get('_percent_str', '0%').replace('%', '').strip()
        try:
            p_float = float(p_str)
            progress_store[url] = str(round(p_float * 0.85, 1))
        except: pass
    elif d['status'] == 'finished':
        progress_store[url] = "90.0"

def remove_file(path: str):
    if os.path.exists(path):
        try: os.remove(path)
        except: pass

@app.get("/progress")
async def get_progress(url: str):
    async def event_generator():
        while True:
            p = progress_store.get(url, "0")
            yield f"data: {p}\n\n"
            if p == "100": break
            await asyncio.sleep(0.5)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/info")
async def get_info(url: str):
    ydl_opts = {'quiet': True, 'noplaylist': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get('title'),
                "duration": info.get('duration'),
                "thumbnail": info.get('thumbnail'),
            }
        except: raise HTTPException(status_code=400, detail="URL 확인 필요")

@app.get("/download")
async def download(url: str, start: int, end: int, mode: str, quality: str, filename: str, background_tasks: BackgroundTasks):
    unique_id = str(uuid.uuid4())[:8]
    file_ext = "mp3" if mode == "audio" else "mp4"
    final_file = os.path.join(DOWNLOAD_DIR, f"{unique_id}.{file_ext}")
    
    progress_store[url] = "5.0"
    
    trim_args = ['-ss', str(start), '-to', str(end)]
    
    ydl_opts = {
        'noplaylist': True,
        'prefer_ffmpeg': True,
        'progress_hooks': [progress_hook],
        'external_downloader': 'ffmpeg',
        'external_downloader_args': {
            'ffmpeg_i': trim_args
        },
    }

    if mode == 'audio':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, f"{unique_id}.%(ext)s"),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': quality,
            }],
            'postprocessor_args': {
                'ExtractAudio': trim_args
            }
        })
    else:
        ydl_opts.update({
            'format': f'bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}]/best',
            'outtmpl': final_file,
            'merge_output_format': 'mp4',
            'postprocessor_args': {
                'merger': trim_args
            }
        })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        actual_path = final_file
        if mode == 'audio' and not os.path.exists(final_file):
            actual_path = os.path.join(DOWNLOAD_DIR, f"{unique_id}.mp3")

        if not os.path.exists(actual_path):
            raise Exception("File process failed")
            
        progress_store[url] = "100"
        download_name = f"{filename}_{quality}.{file_ext}"
        
        background_tasks.add_task(remove_file, actual_path)
        
        return FileResponse(
            actual_path, 
            media_type='application/octet-stream', 
            filename=download_name
        )
    except Exception as e:
        progress_store[url] = "0"
        raise HTTPException(status_code=500, detail=str(e))

# 2. 이 부분을 수정했습니다! (Railway 전용 포트 설정)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)