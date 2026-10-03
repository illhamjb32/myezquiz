"""Uji statis sederhana untuk project EZQuiz (Next.js).

Dijalankan tanpa runtime browser: membaca sumber komponen dan CSS,
lalu memastikan aturan penting tetap ada. Cepat, deterministik,
dan bisa dijalankan kapan saja lewat `python tests/test_ezquiz_ui.py`.
"""

from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "components" / "EzQuizApp.tsx"
CSS = ROOT / "app" / "globals.css"


class QuizEditorQuestionField(unittest.TestCase):
    """Field pertanyaan di editor kuis harus textarea, bukan input biasa."""

    def setUp(self):
        self.source = APP.read_text(encoding="utf-8")

    def test_question_field_is_textarea(self):
        # Cari blok label "Pertanyaan" di dalam QuizEditor.
        match = re.search(r"Pertanyaan<(\w+)", self.source)
        self.assertIsNotNone(match, "Field 'Pertanyaan' tidak ditemukan di editor kuis.")
        self.assertEqual(
            match.group(1),
            "textarea",
            "Field pertanyaan harus memakai <textarea>, bukan <%s>." % match.group(1),
        )

    def test_question_textarea_auto_grows(self):
        self.assertIn(
            "questionInputRefs",
            self.source,
            "Textarea pertanyaan harus punya ref untuk auto-grow.",
        )
        self.assertIn(
            "scrollHeight",
            self.source,
            "Auto-grow butuh pembacaan scrollHeight.",
        )

    def test_question_textarea_is_labelled_for_accessibility(self):
        match = re.search(r"Pertanyaan<textarea(.{0,400})", self.source, re.S)
        self.assertIsNotNone(match)
        block = match.group(1)
        self.assertIn("placeholder=", block, "Textarea pertanyaan butuh placeholder.")
        self.assertIn("required", block, "Textarea pertanyaan harus required.")


class StudentMotionPack(unittest.TestCase):
    """Sisi murid harus punya set animasi yang kaya dan tidak cuma dasar."""

    NEW_ANIMATIONS = [
        "pop-in",
        "slide-in-left",
        "slide-in-right",
        "rise-fade",
        "glow-pulse",
        "burst-ring",
        "confetti-fly",
        "sparkle-twinkle",
        "progress-sheen",
        "crown-bounce",
        "flame-dance",
        "count-pop",
        "rocket-lift",
        "badge-float",
        "orb-wander",
        "aurora-drift",
    ]

    def setUp(self):
        self.css = CSS.read_text(encoding="utf-8")
        self.source = APP.read_text(encoding="utf-8")

    def test_every_new_animation_is_defined_in_css(self):
        for name in self.NEW_ANIMATIONS:
            self.assertIn(
                "@keyframes %s" % name,
                self.css,
                "Keyframes '%s' belum didefinisikan di globals.css." % name,
            )

    def test_animation_utility_classes_exist(self):
        for cls in (
            ".animate-pop-in",
            ".animate-slide-left",
            ".animate-rise",
            ".animate-crown",
            ".animate-flame",
            ".animate-count",
            ".animate-rocket",
            ".animate-badge-float",
            ".animate-orb",
            ".animate-aurora",
            ".animate-glow",
            ".animate-float-soft",
        ):
            self.assertIn(cls, self.css, "Utilitas '%s' belum ada di globals.css." % cls)

    def test_student_side_actually_uses_the_animations(self):
        used = [
            "animate-pop-in",
            "animate-slide-left",
            "animate-slide-right",
            "animate-rise",
            "animate-glow",
            "animate-crown",
            "animate-flame",
            "animate-count",
            "animate-rocket",
            "animate-badge-float",
            "animate-orb",
            "animate-aurora",
            "animate-float-soft",
            "progress-sheen",
            "sparkle-bit",
        ]
        for cls in used:
            self.assertIn(
                cls,
                self.source,
                "Kelas '%s' belum dipakai di EzQuizApp.tsx." % cls,
            )

    def test_confetti_and_burst_are_in_play_for_correct_answers(self):
        self.assertIn("ConfettiBurst", self.source, "Konfeti jawaban benar belum ada.")
        self.assertIn("burst-ring", self.source, "Cincin ledakan jawaban benar belum ada.")

    def test_reduced_motion_still_respected(self):
        self.assertIn(
            "prefers-reduced-motion",
            self.css,
            "Animasi baru harus tetap dihormati oleh prefers-reduced-motion.",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
