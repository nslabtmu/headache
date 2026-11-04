import os
import datetime
import requests
from supabase import create_client, Client

# 1. 連線至 Supabase 資料庫
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")

# 取得今天的日期字串 (格式例如: 2026-06-07)
today = datetime.datetime.now().strftime("%Y-%m-%d")
print(f"--- 開始執行每日提醒檢查，今日日期：{today} ---")

# --- 步驟 A：找出今天「已經填過記錄」的使用者 ID ---
# 假設您的日記資料表叫 user_data，裡面有 user_id 與 record_date 欄位
try:
    today_records = supabase.table("user_data").select("user_id").eq("record_date", today).execute()
    logged_user_ids = {row["user_id"] for row in today_records.data}
except Exception as e:
    print(f"查詢今日填寫記錄失敗: {e}")
    logged_user_ids = set()

# --- 步驟 B：找出所有有綁定 LINE User ID 的受試者 ---
# 假設您的基本資料表叫 profiles，裡面有 id, line_user_id, name 欄位
try:
    profiles_res = supabase.table("profiles").select("*").not_.is_("line_user_id", "null").execute()
    profiles = profiles_res.data
except Exception as e:
    print(f"查詢受試者綁定資料失敗: {e}")
    profiles = []

headers = {
    "Authorization": f"Bearer {CHANNEL_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# --- 步驟 C：比對並發送提醒 ---
for profile in profiles:
    user_id = profile.get("id")         # 受試者在系統中的唯一 ID
    line_user_id = profile.get("line_user_id") # 對方的 LINE 內部識別碼
    name = profile.get("name", "受試者")   # 受試者稱呼

    # 核心邏輯：如果受試者今天「不在」已填寫名單中，且有綁定 LINE ID
    if user_id not in logged_user_ids and line_user_id:
        
        # 準備要傳送給 LINE 的訊息內容
        payload = {
            "to": line_user_id,
            "messages": [
                {
                    "type": "text",
                    "text": f"【偏頭痛與氣象日記提醒】\n{name} 您好，您今天還沒記錄健康與氣象資料喔！\n\n請點擊下方連結前往填寫：\nhttps://您的網址.pages.dev"
                }
            ]
        }
        
        # 透過 LINE Messaging API 發送 Push Message
        res = requests.post("https://api.line.me/v2/bot/message/push", json=payload, headers=headers)
        
        if res.status_code == 200:
            print(f" [成功] 已發送提醒給: {name} (LINE ID: {line_user_id})")
        else:
            print(f" [失敗] 發送給 {name} 失敗，錯誤訊息: {res.text}")
    else:
        print(f" [略過] {name} 今天已完成填寫或未綁定 LINE。")

print("--- 提醒檢查執行完畢 ---")
