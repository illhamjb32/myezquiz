"""HTTP contract tests for the EzQuiz API.

Run against a running Next.js dev server (the default is http://localhost:3000):

    C:/Users/ILHAM-PC/AppData/Local/Programs/Python/Python310/python.exe -m unittest -v tests.test_ezquiz_api

The tests create unique throwaway teacher and student accounts for every test.
They intentionally exercise the real API and Neon database rather than mocking it.
"""

from __future__ import annotations

import os
import unittest
import uuid

import requests


BASE_URL = os.environ.get("EZQUIZ_BASE_URL", "http://localhost:3000").rstrip("/")
PASSWORD = "TestPassword-123"
VALID_QUESTION = {
    "q": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "answer": 1,
    "points": 100,
}


class ApiContractTest(unittest.TestCase):
    """Specification-driven tests for teacher/student quiz workflows."""

    @classmethod
    def setUpClass(cls):
        try:
            response = requests.get(f"{BASE_URL}/api/me", timeout=5)
        except requests.RequestException as exc:
            raise unittest.SkipTest(
                f"EzQuiz server is not running at {BASE_URL}; start it with npm run dev"
            ) from exc
        if response.status_code not in (200, 401):
            raise unittest.SkipTest(
                f"EzQuiz server at {BASE_URL} returned {response.status_code} for /api/me"
            )

    def setUp(self):
        suffix = uuid.uuid4().hex[:12]
        self.teacher = self._register(f"t_{suffix}", "Contract Teacher")
        self.student = self._create_student(f"s_{suffix}", "Contract Student")
        self.quiz_id = self._create_quiz("Contract quiz")
        self.assignment_id = self._assign(self.quiz_id, self.student["user"]["id"])

    def _register(self, username, name):
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/register",
            json={"username": username, "name": name, "password": PASSWORD},
            timeout=15,
        )
        self.assertEqual(response.status_code, 201, response.text)
        user = response.json().get("user")
        self.assertIsInstance(user, dict, response.text)
        return {"session": session, "user": user, "username": username}

    def _create_student(self, username, name):
        response = self.teacher["session"].post(
            f"{BASE_URL}/api/students",
            json={"username": username, "name": name, "password": PASSWORD},
            timeout=15,
        )
        self.assertEqual(response.status_code, 201, response.text)
        student = response.json().get("student")
        self.assertIsInstance(student, dict, response.text)
        student_session = requests.Session()
        login = student_session.post(
            f"{BASE_URL}/api/login",
            json={"username": username, "password": PASSWORD},
            timeout=15,
        )
        self.assertEqual(login.status_code, 200, login.text)
        return {"session": student_session, "user": student, "username": username}

    def _create_quiz(self, title):
        response = self.teacher["session"].post(
            f"{BASE_URL}/api/quizzes",
            json={
                "title": title,
                "desc": "API contract test data",
                "timePerQ": 30,
                "questions": [VALID_QUESTION, {**VALID_QUESTION, "q": "What is 3 + 3?", "answer": 1}],
            },
            timeout=15,
        )
        self.assertEqual(response.status_code, 201, response.text)
        quiz_id = response.json().get("id")
        self.assertIsInstance(quiz_id, int, response.text)
        return quiz_id

    def _assign(self, quiz_id, student_id, due_date=None):
        payload = {"quiz_id": quiz_id, "student_id": student_id}
        if due_date is not None:
            payload["due_date"] = due_date
        response = self.teacher["session"].post(
            f"{BASE_URL}/api/assignments", json=payload, timeout=15
        )
        self.assertEqual(response.status_code, 201, response.text)
        assignments = self.student["session"].get(f"{BASE_URL}/api/quizzes", timeout=15)
        self.assertEqual(assignments.status_code, 200, assignments.text)
        matching = [a for a in assignments.json().get("assignments", []) if a.get("id") == quiz_id]
        self.assertEqual(len(matching), 1, assignments.text)
        return matching[0]["assignmentId"]

    def test_teacher_quiz_assignments_have_a_contract_status(self):
        response = self.teacher["session"].get(f"{BASE_URL}/api/quizzes", timeout=15)
        self.assertEqual(response.status_code, 200, response.text)
        allowed = {"done", "attempting", "pending", "overdue", "due_today"}
        assignments = response.json().get("assignments")
        self.assertIsInstance(assignments, list, response.text)
        own = [a for a in assignments if a.get("assignmentId") == self.assignment_id]
        self.assertEqual(len(own), 1, response.text)
        self.assertIn("status", own[0])
        self.assertIn(own[0]["status"], allowed)

    def test_teacher_analytics_has_counts_average_question_rates_and_attention(self):
        response = self.teacher["session"].get(f"{BASE_URL}/api/analytics", timeout=15)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json().get("analytics")
        self.assertIsInstance(data, dict, response.text)
        for field in ("completedCount", "totalAssignments", "completionRate", "classAveragePercent", "perQuestion", "students"):
            self.assertIn(field, data, response.text)
        self.assertGreaterEqual(data["totalAssignments"], 1, response.text)
        self.assertIsInstance(data["perQuestion"], list)
        self.assertTrue(data["perQuestion"], response.text)
        for question in data["perQuestion"]:
            for field in ("quizId", "quizTitle", "questionIndex", "correctCount", "answeredCount", "correctRate"):
                self.assertIn(field, question, response.text)
        self.assertIsInstance(data["students"], list)
        student = next((s for s in data["students"] if s.get("studentId") == self.student["user"]["id"]), None)
        self.assertIsNotNone(student, response.text)
        for field in ("name", "xp", "completed", "total", "averagePercent", "needsAttention"):
            self.assertIn(field, student, response.text)
        self.assertEqual(student["completed"], 0)
        self.assertEqual(student["name"], "Contract Student")

    def test_duplicate_copies_quiz_title_but_not_assignments(self):
        response = self.teacher["session"].post(
            f"{BASE_URL}/api/duplicate", json={"quiz_id": self.quiz_id}, timeout=15
        )
        self.assertEqual(response.status_code, 201, response.text)
        duplicate_id = response.json().get("quiz", {}).get("id")
        self.assertIsInstance(duplicate_id, int, response.text)
        quizzes = self.teacher["session"].get(f"{BASE_URL}/api/quizzes", timeout=15)
        self.assertEqual(quizzes.status_code, 200, quizzes.text)
        duplicate = next((q for q in quizzes.json().get("quizzes", []) if q.get("id") == duplicate_id), None)
        self.assertIsNotNone(duplicate, quizzes.text)
        original = next(q for q in quizzes.json()["quizzes"] if q.get("id") == self.quiz_id)
        self.assertEqual(duplicate["title"], original["title"] + " (salinan)")
        self.assertFalse(any(a.get("quizId") == duplicate_id for a in quizzes.json().get("assignments", [])))

    def test_student_quiz_response_exposes_server_clock_and_question_timing(self):
        response = self.student["session"].get(
            f"{BASE_URL}/api/quiz/{self.assignment_id}", timeout=15
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        assignment = payload.get("assignment", {})
        for field in ("serverNow", "questionStartedAt", "timePerQuestion"):
            self.assertIn(field, payload, response.text)
        self.assertIsInstance(payload["serverNow"], (int, float))
        self.assertIsInstance(payload["questionStartedAt"], (int, float))
        self.assertEqual(payload["timePerQuestion"], 30)
        self.assertIn("currentQuestion", assignment)

    def test_stale_answer_is_409_and_duplicate_submit_does_not_double_count_xp(self):
        first = self.student["session"].get(f"{BASE_URL}/api/quiz/{self.assignment_id}", timeout=15)
        self.assertEqual(first.status_code, 200, first.text)
        answer_url = f"{BASE_URL}/api/answer/{self.assignment_id}"
        stale = self.student["session"].post(
            answer_url, json={"answer": 1, "question_index": 99}, timeout=15
        )
        self.assertEqual(stale.status_code, 409, stale.text)
        before = self.student["session"].get(f"{BASE_URL}/api/me", timeout=15)
        self.assertEqual(before.status_code, 200, before.text)
        before_xp = before.json()["user"]["xp"]
        valid = self.student["session"].post(
            answer_url, json={"answer": 1, "question_index": 0}, timeout=15
        )
        self.assertEqual(valid.status_code, 200, valid.text)
        expected_xp = valid.json()["xp"]
        duplicate = self.student["session"].post(
            answer_url, json={"answer": 1, "question_index": 0}, timeout=15
        )
        self.assertEqual(duplicate.status_code, 409, duplicate.text)
        after = self.student["session"].get(f"{BASE_URL}/api/me", timeout=15)
        self.assertEqual(after.status_code, 200, after.text)
        # XP is awarded when the attempt is finalized; this test answers only
        # the first of two questions, so the account XP remains unchanged.
        self.assertEqual(after.json()["user"]["xp"], before_xp)
        self.assertGreater(expected_xp, before_xp)

    def test_teacher_endpoints_reject_unauthenticated_and_wrong_role(self):
        endpoints = [
            ("GET", "/api/students"),
            ("GET", "/api/analytics"),
            ("POST", "/api/quizzes"),
        ]
        unauthenticated = requests.Session()
        for method, path in endpoints:
            response = unauthenticated.request(method, BASE_URL + path, json={}, timeout=15)
            self.assertEqual(response.status_code, 401, f"{method} {path}: {response.text}")
            self.assertNotIn("students", response.text.lower())
            self.assertNotIn("completioncounts", response.text.lower())
        for method, path in endpoints:
            response = self.student["session"].request(method, BASE_URL + path, json={}, timeout=15)
            self.assertEqual(response.status_code, 403, f"{method} {path}: {response.text}")
            self.assertNotIn("completioncounts", response.text.lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
