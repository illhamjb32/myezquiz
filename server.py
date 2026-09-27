import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("EZQUIZ_DB", ROOT / "ezquiz.db"))

TEMPLATES = [
    {"title": "Matematika Seru — Level 1", "desc": "Penjumlahan & pengurangan cepat.", "timePerQ": 20, "questions": [
        {"q": "7 + 8 = ...", "options": ["13", "14", "15", "16"], "answer": 2, "points": 100},
        {"q": "20 − 9 = ...", "options": ["9", "10", "11", "12"], "answer": 2, "points": 100},
        {"q": "3 × 4 = ...", "options": ["7", "10", "12", "14"], "answer": 2, "points": 150},
        {"q": "25 : 5 = ...", "options": ["4", "5", "6", "7"], "answer": 1, "points": 150},
        {"q": "9 + 6 − 4 = ...", "options": ["9", "10", "11", "12"], "answer": 2, "points": 200}
    ]},
    {"title": "English Mini Quiz — Greetings", "desc": "Pilih jawaban bahasa Inggris yang tepat.", "timePerQ": 20, "questions": [
        {"q": "'Selamat pagi' dalam bahasa Inggris adalah...", "options": ["Good night", "Good morning", "Good bye", "Good evening"], "answer": 1, "points": 100},
        {"q": "Lawan kata dari 'big' adalah...", "options": ["Large", "Huge", "Small", "Tall"], "answer": 2, "points": 100},
        {"q": "She ___ a student.", "options": ["am", "is", "are", "be"], "answer": 1, "points": 150},
        {"q": "Bahasa Inggrisnya 'kucing' adalah...", "options": ["Dog", "Bird", "Fish", "Cat"], "answer": 3, "points": 100}
    ]}
]


def connect():
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def init_db():
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')),
                teacher_id INTEGER REFERENCES users(id), xp INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER NOT NULL REFERENCES users(id),
                title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', time_per_question INTEGER NOT NULL DEFAULT 20,
                questions TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                due_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(quiz_id, student_id)
            );
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
                correct INTEGER NOT NULL, total INTEGER NOT NULL, xp INTEGER NOT NULL, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attempts (
                assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                current_question INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
                xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
                question_started_at INTEGER NOT NULL
            );
        """)
        db.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt.hex() + ":" + digest.hex()


def verify_password(password, stored):
    try:
        salt, expected = stored.split(":", 1)
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def safe_user(row):
    return {"id": row["id"], "username": row["username"], "name": row["name"], "role": row["role"], "xp": row["xp"]}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        length = min(int(self.headers.get("Content-Length", "0")), 1_000_000)
        return json.loads(self.rfile.read(length) or b"{}")

    def cookie_token(self):
        jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        return jar.get("ezquiz_session").value if jar.get("ezquiz_session") else None

    def current_user(self, db):
        token = self.cookie_token()
        if not token:
            return None
        row = db.execute("SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?", (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
        return row

    def require_user(self, db, role=None):
        user = self.current_user(db)
        if not user:
            raise APIError(401, "Silakan masuk terlebih dahulu.")
        if role and user["role"] != role:
            raise APIError(403, "Akses tidak diizinkan.")
        return user

    def do_GET(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            if parsed.path in ("/server.py", "/ezquiz.db") or parsed.path.startswith("/__pycache__/"):
                self.send_error(404)
                return
            if parsed.path == "/":
                self.path = "/index.html"
            return super().do_GET()
        with connect() as db:
            try:
                user = self.require_user(db)
                if parsed.path == "/api/me":
                    return self.send_json({"user": safe_user(user)})
                if parsed.path == "/api/students":
                    self.require_user(db, "teacher")
                    rows = db.execute("SELECT id,username,name,xp FROM users WHERE teacher_id=? AND role='student' ORDER BY name", (user["id"],)).fetchall()
                    return self.send_json({"students": [dict(row) for row in rows]})
                if parsed.path == "/api/quizzes":
                    if user["role"] == "teacher":
                        rows = db.execute("SELECT * FROM quizzes WHERE teacher_id=? ORDER BY id DESC", (user["id"],)).fetchall()
                        return self.send_json({"quizzes": [self.quiz_dict(row) for row in rows]})
                    rows = db.execute("SELECT a.id AS assignment_id,a.due_date,r.xp AS earned_xp,r.correct,r.total,q.* FROM assignments a JOIN quizzes q ON q.id=a.quiz_id LEFT JOIN results r ON r.assignment_id=a.id WHERE a.student_id=? ORDER BY a.id DESC", (user["id"],)).fetchall()
                    return self.send_json({"assignments": [self.quiz_dict(row, True, include_answers=False) for row in rows]})
                if parsed.path.startswith("/api/quiz/"):
                    assignment_id = int(parsed.path.rsplit("/", 1)[-1])
                    row = db.execute("SELECT a.id AS assignment_id,a.due_date,r.xp AS earned_xp,r.correct AS result_correct,r.total AS result_total,q.* FROM assignments a JOIN quizzes q ON q.id=a.quiz_id LEFT JOIN results r ON r.assignment_id=a.id WHERE a.id=? AND a.student_id=?", (assignment_id, user["id"])).fetchone()
                    if not row:
                        raise APIError(404, "Kuis tidak ditemukan.")
                    if row["earned_xp"] is not None:
                        raise APIError(409, "Kuis ini sudah pernah diselesaikan.")
                    db.execute("INSERT OR IGNORE INTO attempts(assignment_id,student_id,question_started_at) VALUES(?,?,?)", (assignment_id, user["id"], int(time.time())))
                    attempt = db.execute("SELECT current_question,xp,streak FROM attempts WHERE assignment_id=? AND student_id=?", (assignment_id, user["id"])).fetchone()
                    quiz = self.quiz_dict(row, True, include_answers=False)
                    quiz["questions"] = [quiz["questions"][attempt["current_question"]]]
                    quiz["currentQuestion"] = attempt["current_question"]
                    quiz["totalQuestions"] = len(json.loads(row["questions"]))
                    quiz["attemptXP"] = attempt["xp"]
                    quiz["streak"] = attempt["streak"]
                    return self.send_json({"assignment": quiz})
                if parsed.path == "/api/leaderboard":
                    rows = db.execute("SELECT name,xp FROM users WHERE role='student' AND teacher_id=? ORDER BY xp DESC,name LIMIT 10", (user["teacher_id"] if user["role"] == "student" else user["id"],)).fetchall()
                    return self.send_json({"leaderboard": [dict(row) for row in rows]})
                raise APIError(404, "Endpoint tidak ditemukan.")
            except APIError as exc:
                return self.send_json({"error": exc.message}, exc.status)
            except (ValueError, TypeError, json.JSONDecodeError):
                return self.send_json({"error": "Permintaan tidak valid."}, 400)

    def quiz_dict(self, row, is_assignment=False, include_answers=True):
        questions = json.loads(row["questions"])
        if not include_answers:
            questions = [{"q": q["q"], "options": q["options"], "points": q.get("points", 100)} for q in questions]
        result = {"id": row["id"], "title": row["title"], "desc": row["description"], "timePerQ": row["time_per_question"], "questions": questions}
        if is_assignment:
            result.update({"assignmentId": row["assignment_id"], "dueDate": row["due_date"], "earnedXP": row["earned_xp"], "resultCorrect": row["correct"] if "correct" in row.keys() else row["result_correct"], "resultTotal": row["total"] if "total" in row.keys() else row["result_total"]})
        return result

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self.body()
        except (ValueError, json.JSONDecodeError):
            return self.send_json({"error": "Format JSON tidak valid."}, 400)
        with connect() as db:
            try:
                if path == "/api/register":
                    username = str(data.get("username", "")).strip().lower()
                    name = str(data.get("name", "")).strip()
                    password = str(data.get("password", ""))
                    role = "teacher"
                    if not re.fullmatch(r"[a-z0-9_.-]{3,30}", username) or len(password) < 8 or not name:
                        raise APIError(400, "Isi nama, username (min. 3 karakter), dan password (min. 8 karakter).")
                    cur = db.execute("INSERT INTO users(username,name,password,role) VALUES(?,?,?,?)", (username, name, hash_password(password), role))
                    for template in TEMPLATES:
                        db.execute("INSERT INTO quizzes(teacher_id,title,description,time_per_question,questions) VALUES(?,?,?,?,?)", (cur.lastrowid, template["title"], template["desc"], template["timePerQ"], json.dumps(template["questions"], ensure_ascii=False)))
                    return self.login(db, cur.lastrowid)
                if path == "/api/login":
                    username = str(data.get("username", "")).strip().lower()
                    row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
                    if not row or not verify_password(str(data.get("password", "")), row["password"]):
                        raise APIError(401, "Username atau password salah.")
                    return self.login(db, row["id"])
                user = self.require_user(db)
                if path == "/api/logout":
                    token = self.cookie_token()
                    if token:
                        db.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Set-Cookie", "ezquiz_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0")
                    self.end_headers()
                    self.wfile.write(b'{"ok":true}')
                    return
                if path == "/api/students":
                    self.require_user(db, "teacher")
                    username = str(data.get("username", "")).strip().lower()
                    name = str(data.get("name", "")).strip()
                    password = str(data.get("password", ""))
                    if not re.fullmatch(r"[a-z0-9_.-]{3,30}", username) or not name or len(password) < 8:
                        raise APIError(400, "Isi nama, username (min. 3 karakter), dan password (min. 8 karakter).")
                    cur = db.execute("INSERT INTO users(username,name,password,role,teacher_id) VALUES(?,?,?,'student',?)", (username, name, hash_password(password), user["id"]))
                    return self.send_json({"student": {"id": cur.lastrowid, "name": name, "username": username}}, 201)
                if path == "/api/quizzes":
                    self.require_user(db, "teacher")
                    quiz = self.validate_quiz(data)
                    cur = db.execute("INSERT INTO quizzes(teacher_id,title,description,time_per_question,questions) VALUES(?,?,?,?,?)", (user["id"], quiz["title"], quiz["desc"], quiz["timePerQ"], json.dumps(quiz["questions"], ensure_ascii=False)))
                    return self.send_json({"id": cur.lastrowid}, 201)
                if path.startswith("/api/assignments"):
                    self.require_user(db, "teacher")
                    student_id, quiz_id = int(data.get("student_id", 0)), int(data.get("quiz_id", 0))
                    quiz = db.execute("SELECT id FROM quizzes WHERE id=? AND teacher_id=?", (quiz_id, user["id"])).fetchone()
                    student = db.execute("SELECT id FROM users WHERE id=? AND teacher_id=? AND role='student'", (student_id, user["id"])).fetchone()
                    if not quiz or not student:
                        raise APIError(400, "Pilih kuis dan murid dari kelasmu.")
                    db.execute("INSERT INTO assignments(quiz_id,student_id,due_date) VALUES(?,?,?) ON CONFLICT(quiz_id,student_id) DO UPDATE SET due_date=excluded.due_date", (quiz_id, student_id, data.get("due_date") or None))
                    return self.send_json({"ok": True}, 201)
                if path.startswith("/api/answer/"):
                    self.require_user(db, "student")
                    db.execute("BEGIN IMMEDIATE")
                    assignment_id = int(path.rsplit("/", 1)[-1])
                    row = db.execute("SELECT a.id,q.questions,q.time_per_question FROM assignments a JOIN quizzes q ON q.id=a.quiz_id WHERE a.id=? AND a.student_id=?", (assignment_id, user["id"])).fetchone()
                    if not row:
                        raise APIError(404, "Sesi kuis tidak ditemukan.")
                    if db.execute("SELECT 1 FROM results WHERE assignment_id=?", (assignment_id,)).fetchone():
                        raise APIError(409, "Kuis ini sudah pernah diselesaikan.")
                    attempt = db.execute("SELECT * FROM attempts WHERE assignment_id=? AND student_id=?", (assignment_id, user["id"])).fetchone()
                    if not attempt:
                        raise APIError(404, "Sesi kuis tidak ditemukan.")
                    questions = json.loads(row["questions"])
                    index = attempt["current_question"]
                    expected_index = data.get("question_index")
                    if expected_index != index:
                        raise APIError(409, "Sesi kuis sudah berubah. Muat ulang kuis untuk melanjutkan.")
                    if index >= len(questions):
                        raise APIError(409, "Semua soal sudah dijawab.")
                    question = questions[index]
                    selected = data.get("answer")
                    elapsed = max(0, min(row["time_per_question"], int(time.time()) - attempt["question_started_at"]))
                    is_correct = isinstance(selected, int) and selected == question["answer"] and elapsed < row["time_per_question"]
                    correct = attempt["correct"] + (1 if is_correct else 0)
                    streak = attempt["streak"] + 1 if is_correct else 0
                    gain = 0
                    if is_correct:
                        points = int(question.get("points", 100))
                        gain = points + round(max(0, 1 - elapsed / row["time_per_question"]) * points * 0.5) + (round(points * 0.5) if streak >= 3 else 0)
                    xp = attempt["xp"] + gain
                    next_index = index + 1
                    finished = next_index >= len(questions)
                    if finished:
                        db.execute("INSERT INTO results(assignment_id,correct,total,xp) VALUES(?,?,?,?)", (assignment_id, correct, len(questions), xp))
                        db.execute("UPDATE users SET xp=xp+? WHERE id=?", (xp, user["id"]))
                        db.execute("DELETE FROM attempts WHERE assignment_id=?", (assignment_id,))
                    else:
                        db.execute("UPDATE attempts SET current_question=?,correct=?,xp=?,streak=?,question_started_at=? WHERE assignment_id=?", (next_index, correct, xp, streak, int(time.time()), assignment_id))
                    return self.send_json({"isCorrect": is_correct, "correctAnswer": question["answer"], "gain": gain, "xp": xp, "streak": streak, "finished": finished, "correct": correct, "total": len(questions), "nextQuestion": next_index})
                raise APIError(404, "Endpoint tidak ditemukan.")
            except sqlite3.IntegrityError:
                return self.send_json({"error": "Username sudah digunakan."}, 409)
            except APIError as exc:
                return self.send_json({"error": exc.message}, exc.status)
            except (ValueError, TypeError):
                return self.send_json({"error": "Data permintaan tidak valid."}, 400)

    def validate_quiz(self, data):
        title = str(data.get("title", "")).strip()
        questions = data.get("questions")
        if not title or not isinstance(questions, list) or not questions:
            raise APIError(400, "Judul kuis dan minimal satu soal wajib diisi.")
        cleaned = []
        for q in questions:
            opts = q.get("options")
            answer = q.get("answer")
            if not str(q.get("q", "")).strip() or not isinstance(opts, list) or len(opts) != 4 or any(not str(o).strip() for o in opts) or not isinstance(answer, int) or not 0 <= answer < 4:
                raise APIError(400, "Pastikan setiap soal memiliki pertanyaan, empat pilihan, dan kunci jawaban.")
            cleaned.append({"q": str(q["q"]).strip(), "options": [str(o).strip() for o in opts], "answer": answer, "points": max(10, min(1000, int(q.get("points", 100))))})
        return {"title": title[:120], "desc": str(data.get("desc", ""))[:500], "timePerQ": max(5, min(120, int(data.get("timePerQ", 20)))), "questions": cleaned}

    def login(self, db, user_id):
        token = secrets.token_urlsafe(32)
        db.execute("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), user_id, int(time.time()) + 60 * 60 * 24 * 30))
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        body = json.dumps({"user": safe_user(row)}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Set-Cookie", "ezquiz_session=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


class APIError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("API_PORT", os.environ.get("PORT", "8000")))
    print("EZQuiz berjalan di http://localhost:%s" % port)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
