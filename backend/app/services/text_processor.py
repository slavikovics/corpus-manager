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
        tokens = []

        token_position = 0

        for sent in doc.sents:
            sentence_id = sent.start
            words = [token.text for token in sent]

            for i, token in enumerate(sent):
                if not token.text.strip():
                    continue

                token_info = self._extract_token_info(
                    token=token,
                    token_position=token_position,
                    sentence_id=sentence_id,
                    words=words,
                    i=i
                )
                tokens.append(token_info)
                token_position += 1

        return tokens

    def _process_long_text(self, text: str) -> List[Dict[str, Any]]:
        chunks = self._split_into_chunks(text)
        all_tokens = []
        global_token_position = 0
        global_sentence_id = 0

        for chunk_idx, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {chunk_idx + 1}/{len(chunks)} (length: {len(chunk)})")

            try:
                doc = self.nlp(chunk)

                for sent in doc.sents:
                    words = [token.text for token in sent]

                    for i, token in enumerate(sent):
                        if not token.text.strip():
                            continue

                        token_info = self._extract_token_info(
                            token=token,
                            token_position=global_token_position,
                            sentence_id=global_sentence_id,
                            words=words,
                            i=i
                        )
                        all_tokens.append(token_info)
                        global_token_position += 1

                    global_sentence_id += 1

            except Exception as e:
                logger.error(f"Error processing chunk {chunk_idx + 1}: {e}")
                continue

        logger.info(f"Processed {len(all_tokens)} tokens from {len(chunks)} chunks")
        return all_tokens

    def _extract_token_info(self, token, token_position: int, sentence_id: int,
                            words: List[str], i: int) -> Dict[str, Any]:
        left_context = " ".join(words[max(0, i - self.concordance_len):i])
        right_context = " ".join(words[i + 1:min(len(words), i + 1 + self.concordance_len)])

        try:
            morph_dict = token.morph.to_dict() if token.morph else {}
        except:
            morph_dict = {}

        token_info = {
            "position": token_position,
            "sentence_id": sentence_id,
            "word": token.text,
            "lemma": token.lemma_.lower(),
            "pos": token.pos_,
            "morph": morph_dict,
            "dep": token.dep_,
            "head": token.head.text,
            "children": [child.text for child in token.children],
            "prefix": token.prefix_,
            "suffix": token.suffix_,
            "is_punctuation": token.is_punct,
            "is_stopword": token.is_stop,
            "left_context": left_context,
            "right_context": right_context
        }

        return token_info

    def process_text_stream(self, text: str, batch_size: int = 1000) -> Generator[List[Dict[str, Any]], None, None]:
        if not self.nlp:
            raise RuntimeError("spaCy model not initialized")

        clean_text = text.replace('\x00', '')

        if len(clean_text) > self.max_length:
            chunks = self._split_into_chunks(clean_text)

            for chunk in chunks:
                doc = self.nlp(chunk)
                batch_tokens = []

                for sent in doc.sents:
                    words = [token.text for token in sent]

                    for i, token in enumerate(sent):
                        if not token.text.strip():
                            continue

                        token_info = self._extract_token_info(
                            token=token,
                            token_position=0,
                            sentence_id=0,
                            words=words,
                            i=i
                        )
                        batch_tokens.append(token_info)

                        if len(batch_tokens) >= batch_size:
                            yield batch_tokens
                            batch_tokens = []

                if batch_tokens:
                    yield batch_tokens
        else:
            doc = self.nlp(clean_text)
            batch_tokens = []

            for sent in doc.sents:
                words = [token.text for token in sent]

                for i, token in enumerate(sent):
                    if not token.text.strip():
                        continue

                    token_info = self._extract_token_info(
                        token=token,
                        token_position=0,
                        sentence_id=0,
                        words=words,
                        i=i
                    )
                    batch_tokens.append(token_info)

                    if len(batch_tokens) >= batch_size:
                        yield batch_tokens
                        batch_tokens = []

            if batch_tokens:
                yield batch_tokens

    @staticmethod
    def extract_metadata(text: str, filename: str) -> Dict[str, Any]:
        clean_text = text.replace('\x00', '')

        metadata = {
            "source_file": filename,
            "word_count": len(clean_text.split()),
            "char_count": len(clean_text)
        }

        lines = clean_text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if first_line and len(first_line) < 200:
                metadata["title"] = first_line

        return metadata


text_processor = TextProcessor()