"""바라는 점 메일: 지난번 보낸 뒤로 들어온 notes/를 모아 메일 한 통. 새 글이 없으면 '새 글 없음' 한 통(잘 돌아간다는 표시).
예약 실행은 그날(한국) 이미 돌았고 새 글도 없으면 보내지 않는다 — 손으로 돌린 뒤 늦은 예약이 또 보내는 일을 막으려고.
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
last = get("notesMailedAt")
since = last or now_ms - 24 * 3600 * 1000       # 처음엔 지난 하루
notes = sorted((v for v in (get("notes") or {}).values() if isinstance(v, dict) and since < v.get("at", 0) <= now_ms), key=lambda v: v["at"])
print(f"since {since}, new {len(notes)}")
# 방문자 수: visitDays/{YYYYMMDD}/{uid}. 같은 기기는 하루 1명. 집계가 안 돼도 바라는 점 메일은 나가야 한다
def visitors(day):
    try:
        r = requests.get(f"{DB}/visitDays/{day:%Y%m%d}.json", headers=H, params={"shallow": "true"}, timeout=30); r.raise_for_status()
        return len(r.json() or {})
    except Exception as e:
        print("visitor count failed:", type(e).__name__)
        return None

kst_now = datetime.fromtimestamp(now_ms / 1000, KST)
yesterday = visitors(kst_now - timedelta(days=1))
today_so_far = visitors(kst_now)
print(f"visitors yesterday {yesterday}, today {today_so_far}")
visit_short = f"어제 방문 {yesterday}명" if yesterday else "어제 방문 기록 없음"
visit_line = f"{visit_short} · 오늘 지금까지 {today_so_far if today_so_far is not None else '-'}명 (같은 기기는 하루 1명)"
try:                                                            # 60일 지난 집계는 지운다
    days = requests.get(f"{DB}/visitDays.json", headers=H, params={"shallow": "true"}, timeout=30).json() or {}
    cutoff = f"{kst_now - timedelta(days=60):%Y%m%d}"
    for d in days:
        if d < cutoff: requests.delete(f"{DB}/visitDays/{d}.json", headers=H, timeout=30)
except Exception as e:
    print("visitor cleanup failed:", type(e).__name__)

kst_day = lambda ms: datetime.fromtimestamp(ms / 1000, KST).date()
ran_today = bool(last) and kst_day(last) == kst_day(now_ms)
if notes or not (os.environ.get("GITHUB_EVENT_NAME") == "schedule" and ran_today):
    when = lambda ms: datetime.fromtimestamp(ms / 1000, KST).strftime("%m월 %d일 %H:%M")
    today = datetime.now(KST).strftime("%m월 %d일")
    msg = EmailMessage()
    msg["From"], msg["To"] = MAIL_FROM, MAIL_TO
    if notes:
        msg["Subject"] = f"[해조암] {visit_short} · 바라는 점 {len(notes)}개 ({today})"
        msg.set_content(visit_line + "\n\n" + "\n\n".join(f"· {when(n['at'])}\n{n.get('t', '')}" for n in notes) + "\n\n— www.amja.co.kr 대웅전 앞 방명록")
        items = "".join(f'<li style="margin:0 0 14px"><div style="color:#888;font-size:12px">{when(n["at"])}</div><div style="white-space:pre-wrap;font-size:15px">{escape(n.get("t", ""))}</div></li>' for n in notes)
        msg.add_alternative(f'<div style="font-family:sans-serif;max-width:560px"><p style="font-size:15px;margin:0 0 12px">{visit_line}</p><h2 style="font-size:17px">해조암 바라는 점 {len(notes)}개</h2><ul style="padding-left:18px">{items}</ul><p style="color:#888;font-size:12px">www.amja.co.kr 대웅전 앞 방명록</p></div>', subtype="html")
    else:
        msg["Subject"] = f"[해조암] {visit_short} · 새 글 없음 ({today})"
        msg.set_content(visit_line + "\n\n지난번 메일 뒤로 들어온 바라는 점이 없습니다. 메일 시스템은 정상으로 돌았습니다.\n\n— www.amja.co.kr 대웅전 앞 방명록")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context()) as s:
        s.login(MAIL_FROM, os.environ["GMAIL_APP_PASSWORD"].replace(" ", ""))
        s.send_message(msg)
    print("mailed")
requests.put(f"{DB}/notesMailedAt.json", headers=H, data=json.dumps(now_ms), timeout=30).raise_for_status()
