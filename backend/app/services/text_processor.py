import spacy
from typing import List, Dict, Any, Generator, Tuple, Optional
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


class TextProcessor:
    def __init__(self, concordance_len=5, chunk_size=500000):
        self.nlp = None
        self.model_name = settings.SPACY_MODEL
        self.concordance_len = concordance_len
        self.chunk_size = chunk_size
        self.max_length = 1000000

    async def initialize(self):
        try:
            logger.info(f"Loading spaCy model: {self.model_name}")
            self.nlp = spacy.load(self.model_name)

            self.nlp.max_length = self.max_length

            if "sentencizer" not in self.nlp.pipe_names:
                self.nlp.add_pipe("sentencizer")

            logger.info(f"spaCy model loaded successfully with max_length={self.max_length}")

        except OSError:
            logger.warning(f"Model {self.model_name} not found. Downloading...")
            spacy.cli.download(self.model_name)
            self.nlp = spacy.load(self.model_name)
            self.nlp.max_length = self.max_length

    def _split_into_chunks(self, text: str) -> List[str]:
        clean_text = text.replace('\x00', '')

        if len(clean_text) <= self.chunk_size:
            return [clean_text]

        logger.info(f"Splitting text of length {len(clean_text)} into chunks of max {self.chunk_size} chars")

        text_for_splitting = clean_text.replace('\n', ' ').replace('\r', ' ')

        sentences = []
        for sent in text_for_splitting.split('. '):
            if sent:
                sentences.append(sent + '.')

        chunks = []
        current_chunk = []
        current_length = 0

        for sentence in sentences:
            sent_length = len(sentence)

            if sent_length > self.chunk_size:
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    current_length = 0

                words = sentence.split()
                temp_chunk = []
                temp_length = 0

                for word in words:
                    word_len = len(word) + 1
                    if temp_length + word_len > self.chunk_size:
                        chunks.append(' '.join(temp_chunk))
                        temp_chunk = [word]
                        temp_length = word_len
                    else:
                        temp_chunk.append(word)
                        temp_length += word_len

                if temp_chunk:
                    chunks.append(' '.join(temp_chunk))

            elif current_length + sent_length > self.chunk_size:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_length = sent_length
            else:
                current_chunk.append(sentence)
                current_length += sent_length

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        logger.info(f"Text split into {len(chunks)} chunks")
        return chunks

    def process_text(self, text: str) -> List[Dict[str, Any]]:
        if not self.nlp:
            raise RuntimeError("spaCy model not initialized")

        clean_text = text.replace('\x00', '')

        if len(clean_text) > self.max_length:
            logger.warning(
                f"Text length ({len(clean_text)}) exceeds spaCy limit ({self.max_length}). Splitting into chunks...")
            return self._process_long_text(clean_text)
        else:
            return self._process_single_text(clean_text)

    def _process_single_text(self, text: str) -> List[Dict[str, Any]]:
        doc = self.nlp(text)
        all_tokens = []
        sentence_id = 0

        for sent in doc.sents:
            words = [token.text for token in sent]
            for i, token in enumerate(sent):
                if not token.text.strip():
                    continue
                left_context = " ".join(words[max(0, i - self.concordance_len):i])
                right_context = " ".join(words[i + 1:min(len(words), i + 1 + self.concordance_len)])
                token_info = {
                    "position": None,  # будет заполнено позже
                    "sentence_id": sentence_id,
                    "word": token.text,
                    "lemma": token.lemma_.lower(),
                    "pos": token.pos_,
                    "morph": token.morph.to_dict() if token.morph else {},
                    "dep": token.dep_,
                    "head": token.head.text,  # оставляем для обратной совместимости
                    "children": [child.text for child in token.children],
                    "prefix": token.prefix_,
                    "suffix": token.suffix_,
                    "is_punctuation": token.is_punct,
                    "is_stopword": token.is_stop,
                    "left_context": left_context,
                    "right_context": right_context,
                    "head_position": None,
                    "_token": token
                }
                all_tokens.append(token_info)
            sentence_id += 1

        global_pos = 0
        index_to_global = {}
        for token_info in all_tokens:
            token = token_info["_token"]
            index_to_global[token.i] = global_pos
            token_info["position"] = global_pos
            global_pos += 1

        for token_info in all_tokens:
            token = token_info["_token"]
            head_token = token.head
            if head_token == token:
                token_info["head_position"] = None
            else:
                token_info["head_position"] = index_to_global[head_token.i]
            del token_info["_token"]

        return all_tokens

    def _process_long_text(self, text: str) -> List[Dict[str, Any]]:
        chunks = self._split_into_chunks(text)
        all_tokens = []
        global_token_position = 0
        global_sentence_id = 0

        for chunk_idx, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {chunk_idx + 1}/{len(chunks)}")
            doc = self.nlp(chunk)
            chunk_tokens = []

            for sent in doc.sents:
                words = [token.text for token in sent]
                for i, token in enumerate(sent):
                    if not token.text.strip():
                        continue
                    left_context = " ".join(words[max(0, i - self.concordance_len):i])
                    right_context = " ".join(words[i + 1:min(len(words), i + 1 + self.concordance_len)])
                    token_info = {
                        "position": None,
                        "sentence_id": global_sentence_id,
                        "word": token.text,
                        "lemma": token.lemma_.lower(),
                        "pos": token.pos_,
                        "morph": token.morph.to_dict() if token.morph else {},
                        "dep": token.dep_,
                        "head": token.head.text,
                        "children": [child.text for child in token.children],
                        "prefix": token.prefix_,
                        "suffix": token.suffix_,
                        "is_punctuation": token.is_punct,
                        "is_stopword": token.is_stop,
                        "left_context": left_context,
                        "right_context": right_context,
                        "head_position": None,
                        "_token": token
                    }
                    chunk_tokens.append(token_info)
                global_sentence_id += 1

            local_index_to_global = {}
            for token_info in chunk_tokens:
                token = token_info["_token"]
                local_index_to_global[token.i] = global_token_position
                token_info["position"] = global_token_position
                global_token_position += 1

            for token_info in chunk_tokens:
                token = token_info["_token"]
                head_token = token.head
                if head_token == token:
                    token_info["head_position"] = None
                else:
                    token_info["head_position"] = local_index_to_global[head_token.i]
                del token_info["_token"]

            all_tokens.extend(chunk_tokens)

        logger.info(f"Processed {len(all_tokens)} tokens from {len(chunks)} chunks")
        return all_tokens


text_processor = TextProcessor()