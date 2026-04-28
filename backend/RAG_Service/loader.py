import json
import os

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_and_split():
    file_path = "E:\\pbl\\MajorProject\\Datasets_MP\\uttarakhand_tourism_full.json"

    if not os.path.exists(file_path):
        return []

    with open(file_path, "r", encoding="utf-8") as file_handle:
        data = json.load(file_handle)

    destinations = data.get("destinations", []) if isinstance(data, dict) else []
    documents = []

    for destination in destinations:
        if not isinstance(destination, dict):
            continue

        content = json.dumps(destination, ensure_ascii=False)
        documents.append(
            Document(
                page_content=content,
                metadata={
                    "name": destination.get("name") or destination.get("title") or "unknown",
                    "category": destination.get("category") or "destination",
                },
            )
        )

    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
    return splitter.split_documents(documents)