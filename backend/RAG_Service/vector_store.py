import math
import os

from embbedings import get_embedding
from loader import load_and_split


_VECTOR_DB_CACHE = None


class InMemoryRetriever:
    def __init__(self, documents, embeddings):
        self.documents = documents
        self.embeddings = embeddings
        self.document_vectors = embeddings.embed_documents([doc.page_content for doc in documents])

    @staticmethod
    def _cosine_similarity(left, right):
        numerator = sum(x * y for x, y in zip(left, right))
        left_norm = math.sqrt(sum(x * x for x in left))
        right_norm = math.sqrt(sum(y * y for y in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return numerator / (left_norm * right_norm)

    def get_relevant_documents(self, query_text, k=4):
        query_vector = self.embeddings.embed_query(query_text)
        scored_documents = []

        for document, vector in zip(self.documents, self.document_vectors):
            scored_documents.append((self._cosine_similarity(query_vector, vector), document))

        scored_documents.sort(key=lambda item: item[0], reverse=True)
        return [document for _, document in scored_documents[:k]]


class InMemoryVectorDB:
    def __init__(self, documents, embeddings):
        self._retriever = InMemoryRetriever(documents, embeddings)

    def as_retriever(self, search_kwargs=None):
        k = (search_kwargs or {}).get("k", 4)

        class _RetrieverAdapter:
            def __init__(self, retriever, k_value):
                self._retriever = retriever
                self._k = k_value

            def get_relevant_documents(self, query_text):
                return self._retriever.get_relevant_documents(query_text, self._k)

        return _RetrieverAdapter(self._retriever, k)



def create_vector_db():
    global _VECTOR_DB_CACHE

    if _VECTOR_DB_CACHE is not None:
        return _VECTOR_DB_CACHE

    _ = os.getenv("OPENAI_API_KEY")
    documents = load_and_split()
    max_docs = int(os.getenv("RAG_MAX_EMBED_DOCS", "120"))
    if max_docs > 0:
        documents = documents[:max_docs]

    embeddings = get_embedding()
    _VECTOR_DB_CACHE = InMemoryVectorDB(documents, embeddings)
    return _VECTOR_DB_CACHE
