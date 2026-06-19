import os
import sys
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont

# Set up local project paths
PROJECT_DIR = r"C:\Users\HP\zenpaws-brand"
VIDEOS_DIR = os.path.join(PROJECT_DIR, "generated_videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)

# 1. Check for required libraries
try:
    from moviepy import ImageClip, AudioFileClip
except ImportError:
    try:
        from moviepy.editor import ImageClip, AudioFileClip
    except ImportError:
        print("[-] Critical: 'moviepy' is not installed.")
        print("Please run: pip install moviepy gtts pillow")
        sys.exit(1)

def create_ad_video(image_name, text_captions, voiceover_text, output_filename):
    """
    Generates a 9:16 short-form video for TikTok/Reels:
    1. Generates Google Text-to-Speech (gTTS) voiceover.
    2. Draws a styled overlay with caption text onto the base image.
    3. Combines visual and audio into a final MP4.
    """
    print(f"\n[INFO] Starting generation: {output_filename}...")
    
    # Paths
    base_image_path = os.path.join(PROJECT_DIR, image_name)
    temp_audio_path = os.path.join(PROJECT_DIR, "temp_voiceover.mp3")
    temp_frame_path = os.path.join(PROJECT_DIR, "temp_frame.jpg")
    output_video_path = os.path.join(VIDEOS_DIR, output_filename)
    
    # Check if base image exists (if not, create a fallback green background)
    if not os.path.exists(base_image_path):
        print(f"[WARN] Base image '{image_name}' not found. Creating a solid Sage Green canvas...")
        img = Image.new("RGB", (1080, 1920), color=(142, 172, 157)) # Sage Green
        img.save(base_image_path)

    # A. Generate Voiceover MP3
    print("[INFO] Generating voiceover audio...")
    tts = gTTS(text=voiceover_text, lang='en', slow=False)
    tts.save(temp_audio_path)
    
    # B. Render Styled Captions onto Image using PIL (Pillow)
    # Avoids dependency on system-level ImageMagick
    print("[INFO] Rendering text overlays onto canvas...")
    img = Image.open(base_image_path)
    # Resize to standard Reels 9:16 (1080 x 1920)
    img = img.resize((1080, 1920), Image.Resampling.LANCZOS)
    
    draw = ImageDraw.Draw(img)
    
    # Try loading a clean font, fallback to default if missing
    font_size = 56
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()
        print("[WARN] Arial font not found, using default fallback.")

    # Draw Text Box
    # Y-coordinate positioning (lower third of screen)
    box_y_start = 1300
    box_padding = 40
    
    # Format multiline caption text
    wrapped_text = ""
    lines = text_captions.split("\n")
    for line in lines:
        wrapped_text += line + "\n"
        
    # Draw transparent backing rectangle
    # Draw bounding box
    draw.rectangle(
        [(80, box_y_start), (1000, box_y_start + (len(lines) * 80) + box_padding)],
        fill=(31, 62, 61, 230) # Deep Forest Green with opacity
    )
    
    # Draw Text
    draw.text((120, box_y_start + 20), wrapped_text, font=font, fill=(247, 245, 240)) # Alabaster Text
    img.save(temp_frame_path)

    # C. Compile Video using MoviePy
    print("[INFO] Compiling visual frame and voiceover to MP4...")
    audio_clip = AudioFileClip(temp_audio_path)
    duration = audio_clip.duration
    
    # Create static image clip matching the voiceover duration
    video_clip = ImageClip(temp_frame_path)
    if hasattr(video_clip, "with_duration"):
        video_clip = video_clip.with_duration(duration)
    else:
        video_clip = video_clip.set_duration(duration)
        
    if hasattr(video_clip, "with_audio"):
        video_clip = video_clip.with_audio(audio_clip)
    else:
        video_clip = video_clip.set_audio(audio_clip)
    
    # Export File
    video_clip.write_videofile(
        output_video_path,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile="temp_audio.m4a",
        remove_temp=True
    )
    
    # Cleanup temp files
    audio_clip.close()
    video_clip.close()
    if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
    if os.path.exists(temp_frame_path): os.remove(temp_frame_path)
    
    print(f"[SUCCESS] Video saved at: {output_video_path}")

# Run generator for our first ad script
if __name__ == "__main__":
    create_ad_video(
        image_name="calming_bed.jpg", # Uses our calming bed image as the background asset
        text_captions="If your dog pacing anxiously when you leave...\nThey have separation anxiety.\nHere is how we cured it in 2 minutes.",
        voiceover_text="If your dog is pacing anxiously when you leave the house, they have separation anxiety. Here is how we cured it in two minutes with the Zen Paws Calming Bed.",
        output_filename="zenpaws_calming_bed_ad.mp4"
    )
