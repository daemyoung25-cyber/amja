"""바라는 점 메일: 지난번 보낸 뒤로 들어온 notes/를 모아 메일 한 통. 새 글이 없으면 보내지 않는다.
비밀: FIREBASE_SA (서비스 계정 JSON), GMAIL_APP_PASSWORD (보내는 계정의 앱 비밀번호). 보낸 시각은 notesMailedAt에 남긴다."""
import json, os, smtplib, ssl, sys, time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from html import escape
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

DB = "https://amja-a75fa-default-rtdb.asia-southeast1.firebasedatabase.app"
KST = timezone(timedelta(hours=9))
MAIL_TO, MAIL_FROM = os.environ["MAIL_TO"], os.environ["MAIL_FROM"]

cred = service_account.Credentials.from_service_account_info(
    json.loads(os.environ["FIREBASE_SA"]),
    scopes=["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"])
cred.refresh(Request())
H = {"Authorization": f"Bearer {cred.token}"}

def get(path):
    r = requests.get(f"{DB}/{path}.json", headers=H, timeout=30); r.raise_for_status(); return r.json()

now_ms = int(time.time() * 1000)
since = get("notesMailedAt") or now_ms - 24 * 3600 * 1000       # 처음엔 지난 하루
notes = sorted((v for v in (get("notes") or {}).values() if isinstance(v, dict) and since < v.get("at", 0) <= now_ms), key=lambda v: v["at"])
print(f"since {since}, new {len(notes)}")
if notes:
    when = lambda ms: datetime.fromtimestamp(ms / 1000, KST).strftime("%m월 %d일 %H:%M")
    today = datetime.now(KST).strftime("%m월 %d일")
    msg = EmailMessage()
    msg["Subject"] = f"[해조암] 바라는 점 {len(notes)}개 ({today})"
    msg["From"], msg["To"] = MAIL_FROM, MAIL_TO
    msg.set_content("\n\n".join(f"· {when(n['at'])}\n{n.get('t', '')}" for n in notes) + "\n\n— www.amja.co.kr 대웅전 앞 방명록")
    items = "".join(f'<li style="margin:0 0 14px"><div style="color:#888;font-size:12px">{when(n["at"])}</div><div style="white-space:pre-wrap;font-size:15px">{escape(n.get("t", ""))}</div></li>' for n in notes)
    msg.add_alternative(f'<div style="font-family:sans-serif;max-width:560px"><h2 style="font-size:17px">해조암 바라는 점 {len(notes)}개</h2><ul style="padding-left:18px">{items}</ul><p style="color:#888;font-size:12px">www.amja.co.kr 대웅전 앞 방명록</p></div>', subtype="html")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context()) as s:
        s.login(MAIL_FROM, os.environ["GMAIL_APP_PASSWORD"].replace(" ", ""))
        s.send_message(msg)
    print("mailed")
requests.put(f"{DB}/notesMailedAt.json", headers=H, data=json.dumps(now_ms), timeout=30).raise_for_status()
