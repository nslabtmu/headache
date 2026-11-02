# link to line noti..
import os
import datetime
import requests
from supabase import create_client, Client

# 1. 取得 Supabase 連線
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# 2. 取得今天的日期 (YYYY-MM-DD)
today = datetime.datetime.now().strftime("%Y-%m-%d")

# 3. 查詢今天還沒填寫的使用者 (假設資料表叫 profiles，欄位有 line_token 與 last_logged_date)
response = supabase.table("profiles").select("*").neq("last_logged_date", today).execute()
users = response.data

print(f"找到 {len(users)} 位今天尚未填寫的使用者需要發送提醒。")

# 4. 發送 LINE Notify
for user in users:
    token = user.get("line_token")
    name = user.get("name", "使用者")
    
    if token:
        message = f"\n【偏頭痛與氣象日記提醒】\n{name} 您好，您今天還沒記錄健康與氣象資料喔！\n請點擊連結填寫：https://你的網址.com"
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.post("https://notify-api.line.me/api/notify", data={"message": message}, headers=headers)
        
        if res.status_code == 200:
            print(f"成功發送提醒給: {name}")
        else:
            print(f"發送失敗: {name}, 錯誤代碼: {res.status_code}")
