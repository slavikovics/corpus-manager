from elasticsearch import AsyncElasticsearch, NotFoundError
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
                logger.info(f"Index {self.index_name} already exists, deleting...")
                await self.client.indices.delete(index=self.index_name)

            settings_body = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "analysis": {
                        "analyzer": {
                            "english_analyzer": {
                                "type": "english",
                                "stopwords": "_english_"
                            },
                            "ngram_analyzer": {
                                "tokenizer": "ngram_tokenizer",
                                "filter": ["lowercase"]
                            }
                        },
                        "tokenizer": {
                            "ngram_tokenizer": {
                                "type": "ngram",
                                "min_gram": 2,
                                "max_gram": 4,
                                "token_chars": ["letter", "digit"]
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
                                "stemmed": {"type": "text", "analyzer": "english"},
                                "ngrams": {
                                    "type": "text",
                                    "analyzer": "ngram_analyzer"
                                }
                            }
                        },
                        "lemma": {
                            "type": "keyword",
                            "fields": {
                                "text": {"type": "text", "analyzer": "english"},
                                "ngrams": {
                                    "type": "text",
                                    "analyzer": "ngram_analyzer"
                                }
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
                        "created_at": {"type": "date"}
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

    async def search_ngram(
            self,
            query: str,
            field: str = "word.ngrams",
            from_: int = 0,
            size: int = 50
    ) -> Dict[str, Any]:
        body = {
            "query": {
                "match": {
                    field: {
                        "query": query,
                        "operator": "and"
                    }
                }
            },
            "from": from_,
            "size": size,
            "sort": [{"_score": "desc"}, {"doc_id": "asc"}],
            "highlight": {
                "fields": {
                    "word": {
                        "number_of_fragments": 0,
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"]
                    },
                    "lemma.text": {
                        "number_of_fragments": 0,
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"]
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

            total = result.get("hits", {}).get("total", {}).get("value", 0)
            logger.info(f"NGram search for '{query}' found {total} results")

            return result

        except Exception as e:
            logger.error(f"NGram search error: {e}")
            return {"hits": {"hits": [], "total": {"value": 0}}}
    
    async def close(self):
        if self.client:
            await self.client.close()


es_client = ElasticsearchClient()


async def get_es() -> ElasticsearchClient:
    return es_client