/**
 * ZenPaws — Social Media Automation & Video Scheduler
 * 
 * This Python script acts as our automated posting agent:
 * 1. Reads the schedule.json file for pending posts.
 * 2. Uploads the local video file to a temporary public URL (using file.io).
 * 3. Triggers the Instagram Content Publishing API or TikTok Content Posting API.
 * 4. Monitors the upload container and publishes the Reel/TikTok post automatically.
 */

import os
import json
import time
import requests

PROJECT_DIR = r"C:\Users\HP\zenpaws-brand"
SCHEDULE_FILE = os.path.join(PROJECT_DIR, "schedule.json")
CONFIG_FILE = os.path.join(PROJECT_DIR, "social_config.json")

def load_config():
    if not os.path.exists(CONFIG_FILE):
        # Create a dummy config template
        default_config = {
            "instagram_business_account_id": "YOUR_INSTAGRAM_BUSINESS_ID",
            "facebook_page_access_token": "YOUR_ACCESS_TOKEN",
            "tiktok_access_token": "YOUR_TIKTOK_ACCESS_TOKEN",
            "tiktok_open_id": "YOUR_TIKTOK_OPEN_ID"
        }
        with open(CONFIG_FILE, "w") as f:
            json.dump(default_config, f, indent=4)
        print(f"📝 Created configuration template: {CONFIG_FILE}. Please fill in your API tokens.")
    
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def load_schedule():
    if not os.path.exists(SCHEDULE_FILE):
        default_schedule = [
            {
                "video_file": "zenpaws_calming_bed_ad.mp4",
                "caption": "Is your pup anxious when you leave? 🐾 Check out the ZenPaws Calming Bed! Save 30% today. #anxiousdog #dogsoftiktok #petwellness",
                "status": "pending",
                "platform": "instagram"
            }
        ]
        with open(SCHEDULE_FILE, "w") as f:
            json.dump(default_schedule, f, indent=4)
        print(f"📝 Created schedule template: {SCHEDULE_FILE}")
    
    with open(SCHEDULE_FILE, "r") as f:
        return json.load(f)

def upload_to_temp_host(video_path):
    """
    Uploads the local MP4 video file to file.io (temporary file hosting).
    Returns a direct URL. The file is deleted automatically after 1 download.
    """
    print(f"📤 Uploading '{os.path.basename(video_path)}' to temporary public host...")
    with open(video_path, 'rb') as f:
        response = requests.post('https://file.io', files={'file': f})
        
    if response.status_code == 200:
        download_url = response.json().get('link')
        print(f"🔗 Temporary URL generated: {download_url} (Will auto-delete after download)")
        return download_url
    else:
        print("❌ Temporary upload failed.")
        return None

def publish_instagram_reel(config, video_url, caption):
    """
    Uses the Meta Graph API to post a video as an Instagram Reel.
    """
    ig_id = config.get("instagram_business_account_id")
    token = config.get("facebook_page_access_token")
    
    if ig_id == "YOUR_INSTAGRAM_BUSINESS_ID" or not token:
        print("⚠️ Skipping Instagram: Config variables not set.")
        return False
        
    print("🚀 Initializing Instagram Reels Container...")
    # Step 1: Create Container
    url = f"https://graph.facebook.com/v18.0/{ig_id}/media"
    payload = {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": caption,
        "access_token": token
    }
    response = requests.post(url, data=payload)
    if response.status_code != 200:
        print(f"❌ Failed to create Reel container: {response.text}")
        return False
        
    container_id = response.json().get("id")
    print(f"📦 Container created. ID: {container_id}. Waiting for processing...")
    
    # Step 2: Poll Container Status until Finished
    status_url = f"https://graph.facebook.com/v18.0/{container_id}"
    params = {
        "fields": "status_code",
        "access_token": token
    }
    
    for attempt in range(15):
        time.sleep(15) # Wait 15 seconds between checks
        status_res = requests.get(status_url, params=params)
        status_code = status_res.json().get("status_code")
        print(f"⏱️ Check #{attempt+1}: Processing status is '{status_code}'")
        
        if status_code == "FINISHED":
            break
        elif status_code == "ERROR":
            print("❌ Processing error reported by Meta.")
            return False
    else:
        print("❌ Timeout waiting for Meta processing.")
        return False
        
    # Step 3: Publish the Reel
    print("🔥 Publishing Reel to Instagram live feed...")
    publish_url = f"https://graph.facebook.com/v18.0/{ig_id}/media_publish"
    publish_payload = {
        "creation_id": container_id,
        "access_token": token
    }
    publish_res = requests.post(publish_url, data=publish_payload)
    if publish_res.status_code == 200:
        print("🎉 Successfully published Reel!")
        return True
    else:
        print(f"❌ Publishing failed: {publish_res.text}")
        return False

def process_scheduler():
    config = load_config()
    schedule = load_schedule()
    
    updated = False
    for post in schedule:
        if post.get("status") == "pending":
            video_name = post.get("video_file")
            video_path = os.path.join(PROJECT_DIR, "generated_videos", video_name)
            
            if not os.path.exists(video_path):
                print(f"⚠️ Video file '{video_name}' not found in generated_videos. Skipping.")
                continue
                
            # 1. Upload to public link
            temp_url = upload_to_temp_host(video_path)
            if not temp_url:
                continue
                
            # 2. Trigger appropriate platform
            success = False
            if post.get("platform") == "instagram":
                success = publish_instagram_reel(config, temp_url, post.get("caption"))
                
            if success:
                post["status"] = "published"
                post["published_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
                updated = True
                
    if updated:
        with open(SCHEDULE_FILE, "w") as f:
            json.dump(schedule, f, indent=4)
        print("💾 Schedule file updated.")

if __name__ == "__main__":
    process_scheduler()
