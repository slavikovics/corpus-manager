import spacy
from typing import List, Dict, Any, Generator, Tuple
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


class TextProcessor:    
    def __init__(self):
        self.nlp = None
        self.model_name = settings.SPACY_MODEL
    
    async def initialize(self):
        try:
            logger.info(f"Loading spaCy model: {self.model_name}")
            self.nlp = spacy.load(self.model_name)

            if "sentencizer" not in self.nlp.pipe_names:
                self.nlp.add_pipe("sentencizer")

            logger.info("spaCy model loaded successfully")
        except OSError:
            logger.warning(f"Model {self.model_name} not found. Downloading...")
            spacy.cli.download(self.model_name)
            self.nlp = spacy.load(self.model_name)
    
    def process_text(self, text: str) -> List[Dict[str, Any]]:
        if not self.nlp:
            raise RuntimeError("spaCy model not initialized")
        
        clean_text = text.replace('\x00', '')
    
        doc = self.nlp(clean_text)
        tokens = []
    
        for sent in doc.sents:
            sentence_id = sent.start
            words = [token.text for token in sent]
        
            for i, token in enumerate(sent):
                if not token.text.strip():
                    continue
                
                left_context = " ".join(words[max(0, i-5):i])
                right_context = " ".join(words[i+1:min(len(words), i+6)])
            
                token_info = {
                    "position": token.i,
                    "sentence_id": sentence_id,
                    "word": token.text,
                    "lemma": token.lemma_.lower(),
                    "pos": token.pos_,
                    "tag": token.tag_,
                    "is_punctuation": token.is_punct,
                    "is_stopword": token.is_stop,
                    "left_context": left_context,
                    "right_context": right_context
                }
                tokens.append(token_info)
    
        return tokens
    
    def process_batch(self, texts: List[str]) -> Generator[List[Dict[str, Any]], None, None]:
        for text in texts:
            yield self.process_text(text)
    
    def extract_metadata(self, text: str, filename: str) -> Dict[str, Any]:
        metadata = {
            "source_file": filename,
            "word_count": len(text.split()),
            "char_count": len(text)
        }
        
        lines = text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if first_line and len(first_line) < 200:
                metadata["title"] = first_line
        
        return metadata

text_processor = TextProcessor()