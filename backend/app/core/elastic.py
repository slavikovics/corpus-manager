from elasticsearch import AsyncElasticsearch
from typing import Dict, Any, List, Optional
import logging
from .config import settings

logger = logging.getLogger(__name__)


class ElasticsearchClient:
    def __init__(self):
        self.client = None
        self.index_name = settings.ELASTICSEARCH_INDEX

    async def initialize(self):
        self.client = AsyncElasticsearch(
            [settings.ELASTICSEARCH_URL],
            request_timeout=30,
            max_retries=3,
            retry_on_timeout=True
        )

        try:
            info = await self.client.info()
            logger.info(f"Connected to Elasticsearch: {info['version']['number']}")
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            raise

        await self._create_index_if_not_exists()

    async def _create_index_if_not_exists(self):
        if not self.client:
            logger.warning("Elasticsearch client not available")
            return

        try:
            exists = await self.client.indices.exists(index=self.index_name)
            if exists:
                return
                #logger.info(f"Index {self.index_name} already exists, deleting...")
                #await self.client.indices.delete(index=self.index_name)

            settings_body = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "analysis": {
                        "analyzer": {
                            "english_analyzer": {
                                "type": "english",
                                "stopwords": "_english_"
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "doc_id": {"type": "integer"},
                        "position": {"type": "integer"},
                        "sentence_id": {"type": "integer"},
                        "word": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256},
                                "stemmed": {"type": "text", "analyzer": "english"}
                            }
                        },
                        "lemma": {
                            "type": "keyword",
                            "fields": {
                                "text": {"type": "text", "analyzer": "english"}
                            }
                        },
                        "pos": {"type": "keyword"},
                        "tag": {"type": "keyword"},
                        "is_punctuation": {"type": "boolean"},
                        "is_stopword": {"type": "boolean"},
                        "left_context": {"type": "text", "analyzer": "english"},
                        "right_context": {"type": "text", "analyzer": "english"},
                        "metadata": {
                            "properties": {
                                "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                                "author": {"type": "keyword"},
                                "year": {"type": "integer"},
                                "language": {"type": "keyword"},
                                "original_filename": {"type": "keyword"}
                            }
                        },
                        "created_at": {"type": "date"},
                        "suggest": {
                            "type": "completion",
                            "fields": {
                                "word": {"type": "completion"},
                                "lemma": {"type": "completion"}
                            }
                        }
                    }
                }
            }

            await self.client.indices.create(
                index=self.index_name,
                body=settings_body
            )
            logger.info(f"Created index: {self.index_name}")
        except Exception as e:
            logger.error(f"Error creating index: {e}")

    async def index_document_batch(self, actions: List[Dict[str, Any]]):
        if not actions:
            return

        try:
            from elasticsearch.helpers import async_bulk
            success, failed = await async_bulk(
                self.client,
                actions,
                index=self.index_name,
                refresh=True,
                raise_on_error=False
            )
            logger.info(f"Indexed {success} documents, failed: {failed}")
            return success, failed
        except Exception as e:
            logger.error(f"Bulk indexing error: {e}")
            return 0, len(actions)

    async def search_concordance(
        self,
        query: str,
        field: str = "lemma",
        context_size: int = 5,
        fuzzy: bool = False,
        from_: int = 0,
        size: int = 50
    ) -> Dict[str, Any]:
        if fuzzy:
            search_query = {
                "match": {
                    field: {
                        "query": query,
                        "fuzziness": "AUTO",
                        "operator": "and"
                    }
                }
            }
        else:
            search_query = {"term": {field: query.lower()}}

        body = {
            "query": search_query,
            "from": from_,
            "size": size,
            "sort": [{"doc_id": "asc"}, {"position": "asc"}],
            "highlight": {
                "fields": {
                    "word": {
                        "number_of_fragments": 0,
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"]
                    },
                    "left_context": {
                        "number_of_fragments": 1,
                        "fragment_size": 50
                    },
                    "right_context": {
                        "number_of_fragments": 1,
                        "fragment_size": 50
                    }
                }
            },
            "_source": ["doc_id", "position", "word", "lemma", "pos", "metadata", "left_context", "right_context"]
        }

        try:
            result = await self.client.search(
                index=self.index_name,
                body=body
            )
            return result
        except Exception as e:
            logger.error(f"Search error: {e}")
            return {"hits": {"hits": [], "total": {"value": 0}}}

    async def get_word_statistics(
        self,
        lemma: str,
        pos: Optional[str] = None
    ) -> Dict[str, Any]:
        filters = [{"term": {"lemma": lemma}}]
        if pos:
            filters.append({"term": {"pos": pos}})

        body = {
            "query": {"bool": {"filter": filters}},
            "aggs": {
                "by_document": {
                    "terms": {"field": "doc_id", "size": 10},
                    "aggs": {
                        "by_pos": {"terms": {"field": "pos.keyword"}},
                        "context": {
                            "top_hits": {
                                "size": 3,
                                "_source": ["left_context", "word", "right_context"]
                            }
                        }
                    }
                },
                "by_pos": {"terms": {"field": "pos.keyword"}},
                "total_count": {"value_count": {"field": "doc_id"}}
            },
            "size": 0
        }

        try:
            result = await self.client.search(
                index=self.index_name,
                body=body
            )
            return result.get("aggregations", {})
        except Exception as e:
            logger.error(f"Statistics error: {e}")
            return {}
        
    async def search_phrase(
        self,
        phrase: str,
        field: str = "word",
        slop: int = 2,
        fuzziness: str = "AUTO",
        from_: int = 0,
        size: int = 50
    ) -> Dict[str, Any]:
        words = phrase.split()
        if len(words) < 2:
            return await self.search_concordance(words[0], field, fuzziness != "0", from_, size)
        
        logger.info(f"Phrase search for {len(words)} words: {words} with slop={slop}, fuzziness={fuzziness}")
        word_positions = {}
        
        for word_idx, word in enumerate(words):
            if fuzziness == "0":
                if field == "lemma":
                    query = {"term": {field: word.lower()}}
                else:
                    query = {
                        "match": {
                            field: {
                                "query": word,
                                "operator": "and"
                            }
                        }
                    }
            else:
                query = {
                    "match": {
                        field: {
                            "query": word,
                            "fuzziness": fuzziness,
                            "operator": "and",
                            "prefix_length": 2,
                            "max_expansions": 50
                        }
                    }
                }
            
            body = {
                "query": query,
                "size": 10000,
                "_source": ["doc_id", "position", "word", "lemma", "pos", "metadata", "left_context", "right_context"],
                "sort": [{"doc_id": "asc"}, {"position": "asc"}]
            }
            
            result = await self.client.search(index=self.index_name, body=body)
            hits = result.get("hits", {}).get("hits", [])
            logger.info(f"Word '{word}' found in {len(hits)} positions (fuzziness={fuzziness})")
            
            if hits and logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"Sample hits for '{word}':")
                for hit in hits[:3]:
                    src = hit["_source"]
                    logger.debug(f"  doc={src['doc_id']}, pos={src['position']}, word='{src['word']}', score={hit['_score']}")
            
            for hit in hits:
                src = hit["_source"]
                doc_id = src["doc_id"]
                matched_word = src[field]
                
                if doc_id not in word_positions:
                    word_positions[doc_id] = {}
                
                if word_idx not in word_positions[doc_id]:
                    word_positions[doc_id][word_idx] = []
                
                word_positions[doc_id][word_idx].append({
                    "position": src["position"],
                    "word": src["word"],
                    "lemma": src.get("lemma", ""),
                    "pos": src.get("pos", ""),
                    "metadata": src.get("metadata", {}),
                    "left_context": src.get("left_context", ""),
                    "right_context": src.get("right_context", ""),
                    "matched_word": matched_word,
                    "original_query": word,
                    "_score": hit.get("_score", 1.0)
                })
        
        matches = []
        
        for doc_id, word_dict in word_positions.items():
            if len(word_dict) < len(words):
                continue
            
            positions_lists = [sorted(word_dict[i], key=lambda x: x["position"]) for i in range(len(words))]
            
            for first_word_pos in positions_lists[0]:
                first_pos = first_word_pos["position"]
                
                sequence_tokens = [first_word_pos]
                
                current_pos = first_pos
                valid = True
                
                for i in range(1, len(words)):
                    found = False
                    min_pos = current_pos + 1
                    max_pos = current_pos + 1 + slop
                    
                    for candidate in positions_lists[i]:
                        if min_pos <= candidate["position"] <= max_pos:
                            sequence_tokens.append(candidate)
                            current_pos = candidate["position"]
                            found = True
                            break
                    
                    if not found:
                        valid = False
                        break
                
                if valid:
                    scores = [t["_score"] for t in sequence_tokens if t["_score"] is not None]
                    if not scores:
                        avg_score = 1.0
                    else:
                        avg_score = sum(scores) / len(scores)
                    
                    matched_words = [t["word"] for t in sequence_tokens]
                    original_queries = [t["original_query"] for t in sequence_tokens]
                    
                    logger.info(f"Found sequence in doc {doc_id}: positions={[t['position'] for t in sequence_tokens]}, "
                            f"words={matched_words}, original={original_queries}")
                    
                    matches.append({
                        "doc_id": doc_id,
                        "tokens": sequence_tokens,
                        "start_pos": first_pos,
                        "end_pos": sequence_tokens[-1]["position"],
                        "score": avg_score,
                        "matched_words": matched_words,
                        "original_queries": original_queries
                    })
        
        matches.sort(key=lambda x: x["score"], reverse=True)
        logger.info(f"Found {len(matches)} phrase matches")
        
        total = len(matches)
        paginated_matches = matches[from_:from_ + size]
        
        hits_output = []
        for match in paginated_matches:
            tokens = match["tokens"]
            
            left_ctx = tokens[0].get("left_context", "")
            right_ctx = tokens[-1].get("right_context", "")
            
            hit = {
                "_index": self.index_name,
                "_id": f"{match['doc_id']}_{match['start_pos']}",
                "_score": match["score"],
                "_source": {
                    "doc_id": match["doc_id"],
                    "position_start": match["start_pos"],
                    "position_end": match["end_pos"],
                    "words": [t["word"] for t in tokens],
                    "lemmas": [t["lemma"] for t in tokens],
                    "pos_tags": [t["pos"] for t in tokens],
                    "matched_words": match["matched_words"],
                    "original_queries": match["original_queries"],
                    "metadata": tokens[0]["metadata"],
                    "left_context": left_ctx,
                    "right_context": right_ctx,
                    "full_phrase": " ".join([t["word"] for t in tokens])
                }
            }
            hits_output.append(hit)
        
        return {
            "hits": {
                "total": {"value": total},
                "hits": hits_output
            }
        }

    async def close(self):
        if self.client:
            await self.client.close()


es_client = ElasticsearchClient()


async def get_es() -> ElasticsearchClient:
    return es_client