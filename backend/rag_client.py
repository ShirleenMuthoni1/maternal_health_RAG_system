# This file is the only place that "gets an answer" for a question.
# It sends the question to the RAG pipeline running in Colab and returns the reply.
#
# Two lines in backend/.env control it:
#   RAG_URL=https://something.trycloudflare.com   (the address Colab printed)
#   RAG_KEY=the-secret-word                       (the same word as RAG_SECRET in Colab)
# If RAG_URL is empty, a pretend answer is used, so the website still works without Colab.

import os

import requests


class RagUnavailable(Exception):
    """Raised when the RAG pipeline cannot be reached or gives a bad reply."""


# Pretend answers, used only when RAG_URL is empty
DEMO_DANGER_WORDS = [
    "heavy bleeding", "severe headache", "convulsion", "seizure",
    "blurred vision", "severe abdominal pain", "severe lower abdominal pain",
    "baby is not moving", "no fetal movement", "reduced fetal movement",
    "kutokwa na damu nyingi", "kichwa kuuma sana", "degedege", "mtoto hasogei",
]

PLACEHOLDER_ANSWER = {
    "en": (
        "This is a placeholder answer because the RAG pipeline is not connected. "
        "Set RAG_URL in backend/.env to get real answers."
    ),
    "sw": (
        "Hili ni jibu la mfano kwa sababu mfumo wa RAG haujaunganishwa. "
        "Weka RAG_URL kwenye backend/.env ili kupata majibu halisi."
    ),
}


def placeholder_answer(question, language):
    lower = question.lower()
    if any(word in lower for word in DEMO_DANGER_WORDS):
        return {"danger": True, "answer": None, "sources": []}
    return {
        "danger": False,
        "answer": PLACEHOLDER_ANSWER.get(language, PLACEHOLDER_ANSWER["en"]),
        "sources": ["Sample source one", "Sample source two"],
    }


def get_answer(question, language, profile):
    """Returns {"danger": bool, "answer": text or None, "sources": [names], "topic": text or None}.

    question: what the mother typed
    language: "en" or "sw"
    profile: her saved profile (weeks, location), or None (not used by the pipeline yet)
    """
    url = os.environ.get("RAG_URL", "").strip().rstrip("/")
    if not url:
        return placeholder_answer(question, language)

    key = os.environ.get("RAG_KEY", "")

    try:
        reply = requests.post(
            url + "/ask",
            json={"question": question, "language": language},
            headers={"X-RAG-Key": key},
            timeout=180,  # a Kiswahili answer can take 10 to 30 seconds
        )
    except requests.RequestException:
        raise RagUnavailable("Could not reach the RAG pipeline.")

    if reply.status_code != 200:
        raise RagUnavailable("The RAG pipeline replied with status " + str(reply.status_code))

    try:
        data = reply.json()
    except ValueError:
        raise RagUnavailable("The RAG pipeline sent a reply that is not JSON.")

    return {
        "danger": bool(data.get("danger")),
        "answer": data.get("answer"),
        "sources": list(data.get("sources") or []),
        "topic": data.get("topic"),
    } 