# This file is the only place that "gets an answer" for a question.
# For now it gives a pretend answer. Later it will call the RAG pipeline running in Colab.

# TEMPORARY danger words. The real danger check comes with the RAG pipeline.
DEMO_DANGER_WORDS = [
    "heavy bleeding", "severe headache", "convulsion", "seizure",
    "blurred vision", "severe abdominal pain", "severe lower abdominal pain",
    "baby is not moving", "no fetal movement", "reduced fetal movement",
    "kutokwa na damu nyingi", "kichwa kuuma sana", "degedege", "mtoto hasogei",
]

PLACEHOLDER_ANSWER = {
    "en": (
        "This is a placeholder answer while the RAG pipeline is being connected. "
        "In the finished system, the response will be generated from the trusted maternal "
        "health sources in the knowledge base, using your gestational age and location."
    ),
    "sw": (
        "Hili ni jibu la mfano wakati mfumo wa RAG unaunganishwa. "
        "Katika mfumo uliokamilika, jibu litatolewa kutoka kwenye vyanzo vya kuaminika vya "
        "afya ya uzazi, kwa kutumia umri wa ujauzito wako na mahali ulipo."
    ),
}


def get_answer(question, language, profile):
    """Returns {"danger": bool, "answer": text or None, "sources": [names]}.

    question: what the mother typed
    language: "en" or "sw"
    profile: her saved profile (weeks, location), or None
    """
    lower = question.lower()
    if any(word in lower for word in DEMO_DANGER_WORDS):
        return {"danger": True, "answer": None, "sources": []}

    return {
        "danger": False,
        "answer": PLACEHOLDER_ANSWER.get(language, PLACEHOLDER_ANSWER["en"]),
        "sources": ["Sample source one", "Sample source two"],
    }