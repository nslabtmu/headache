import os
import datetime
from dateutil.relativedelta import relativedelta
import requests
from supabase import create_client, Client

# 連線 Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
today = datetime.date.today()
today_str = today.strftime("%Y-%m-%d")

print(f"--- 開始執行每日提醒檢查，今日日期：{today_str} ---")

# 1. 查出今天已經填過紀錄的人
try:
    today_records = supabase.table("user_data").select("user_id").eq("record_date", today_str).execute()
    logged_user_ids = {row["user_id"] for row in today_records.data}
except Exception as e:
    print(f"查詢今日填寫記錄失敗: {e}")
    logged_user_ids = set()

# 2. 查出所有允許傳送提醒且有 LINE ID 的受試者
try:
    profiles_res = supabase.table("profiles").select("*").eq("send_reminder", True).not_.is_("line_user_id", "null").execute()
    profiles = profiles_res.data
except Exception as e:
    print(f"查詢受試者資料失敗: {e}")
    profiles = []

headers = {
    "Authorization": f"Bearer {CHANNEL_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 各分組的特定音樂播放頁面或網址
MUSIC_LINKS = {
    "free": "https://你的網址.pages.dev?mode=free",
    "piano": "https://你的網址.pages.dev?mode=piano",
    "forest": "https://你的網址.pages.dev?mode=forest",
    "ocean": "https://你的網址.pages.dev?mode=ocean"
}

for profile in profiles:
    user_id = profile.get("id")
    line_user_id = profile.get("line_user_id")
    name = profile.get("name", "受試者")
    is_study = profile.get("is_study_participant", False)
    start_date_str = profile.get("study_start_date")
    duration_months = profile.get("study_duration_months", 3)
    music_group = profile.get("music_group", "free")

    # 判斷 A：是否在 3 個月研究期限內
    in_study_period = True
    if is_study and start_date_str:
        start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = start_date + relativedelta(months=duration_months)
        if today > end_date:
            in_study_period = False
            print(f" [略過] {name} 已超出 {duration_months} 個月研究期限 (結束日: {end_date})")

    # 判斷 B：今天尚未填寫 & 在研究期限內
    if user_id not in logged_user_ids and in_study_period and line_user_id:
        music_url = MUSIC_LINKS.get(music_group, MUSIC_LINKS["free"])
        
        msg_text = (
            f"【偏頭痛與音樂治療日記提醒】\n"
            f"{name} 您好，今天尚未記錄健康日記喔！\n\n"
            f"🎵 請點擊專屬連結播放音樂並填寫日記：\n{music_url}"
        )

        payload = {
            "to": line_user_id,
            "messages": [{"type": "text", "text": msg_text}]
        }

        res = requests.post("https://api.line.me/v2/bot/message/push", json=payload, headers=headers)
        if res.status_code == 200:
            print(f" [成功] 已發送專屬音樂提醒給: {name} (組別: {music_group})")
        else:
            print(f" [失敗] 發送給 {name} 失敗: {res.text}")

print("--- 檢查完成 ---")
