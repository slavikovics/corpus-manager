import logging
from fastapi import APIRouter, Depends, HTTPException, Query

from ...core.elastic import get_es, ElasticsearchClient
from ...models.search import SearchResponse, SearchResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResponse)
async def search(
        query: str = Query(..., description="Search query"),
        mode: str = Query("concordance", description="Search mode: concordance, word, phrase"),
        search_type: str = Query("exact", description="Search type: exact, fuzzy"),
        field: str = Query("lemma", description="Field to search (word or lemma)"),
        slop: int = Query(0, ge=0, description="Slop for phrase search (0 = strict sequence)"),
        fuzziness: str = Query("AUTO", description="Fuzziness for fuzzy search (AUTO, 1, 2, or 0)"),
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=200),
        es: ElasticsearchClient = Depends(get_es)
):
    from_ = (page - 1) * page_size

    try:
        if mode == "concordance":
            result = await es.search_concordance(
                query=query,
                field=field,
                fuzzy=(search_type == "fuzzy"),
                from_=from_,
                size=page_size
            )
            
            hits = result.get("hits", {})
            total = hits.get("total", {}).get("value", 0)

            results = []
            for hit in hits.get("hits", []):
                source = hit["_source"]
                highlight = hit.get("highlight", {})
                
                word = highlight.get("word", [source["word"]])[0] if highlight.get("word") else source["word"]
                
                results.append(SearchResult(
                    doc_id=source["doc_id"],
                    word=word,
                    lemma=source.get("lemma", ""),
                    sentence_id=source.get("sentence_id", -1),
                    pos=source.get("pos", ""),
                    left_context=source.get("left_context", ""),
                    right_context=source.get("right_context", ""),
                    metadata=source.get("metadata", {}),
                    score=hit.get("_score", 0.0)
                ))

            return SearchResponse(
                total=total,
                page=page,
                page_size=page_size,
                results=results,
                query=query,
                mode=mode,
                search_type=search_type
            )

        elif mode == "word":
            stats = await es.get_word_statistics(
                lemma=query,
                pos=None
            )
            
            results = []
            total_count = stats.get("total_count", {}).get("value", 0)
            
            by_document = stats.get("by_document", {}).get("buckets", [])
            for doc_bucket in by_document:
                doc_id = doc_bucket["key"]
                doc_count = doc_bucket["doc_count"]
                
                contexts = doc_bucket.get("context", {}).get("hits", {}).get("hits", [])
                for ctx in contexts:
                    ctx_source = ctx.get("_source", {})
                    results.append(SearchResult(
                        doc_id=doc_id,
                        word=ctx_source.get("word", ""),
                        lemma=query,
                        sentence_id=ctx_source.get("sentence_id", -1),
                        pos=ctx_source.get("pos", ""),
                        left_context=ctx_source.get("left_context", ""),
                        right_context=ctx_source.get("right_context", ""),
                        metadata=ctx_source.get("metadata", {}),
                        score=1.0
                    ))
            
            if not results and total_count > 0:
                results.append(SearchResult(
                    doc_id=0,
                    word=query,
                    lemma=query,
                    sentence_id=-1,
                    pos="",
                    left_context="",
                    right_context="",
                    metadata={},
                    score=1.0
                ))

            return SearchResponse(
                total=total_count,
                page=page,
                page_size=page_size,
                results=results,
                query=query,
                mode=mode,
                search_type=search_type
            )

        else:
            if search_type == "fuzzy":
                result = await es.search_phrase(
                    phrase=query,
                    field=field,
                    slop=slop,
                    fuzziness=fuzziness,
                    from_=from_,
                    size=page_size
                )
            else:
                result = await es.search_phrase(
                    phrase=query,
                    field=field,
                    slop=slop,
                    fuzziness="0",
                    from_=from_,
                    size=page_size
                )

            hits = result.get("hits", {})
            total = hits.get("total", {}).get("value", 0)

            results = []
            for hit in hits.get("hits", []):
                source = hit["_source"]
                
                if "words" in source:
                    words = source["words"]
                    lemmas = source.get("lemmas", [])
                    pos_tags = source.get("pos_tags", [])
                    phrase_text = " ".join(words)
                    
                    results.append(SearchResult(
                        doc_id=source["doc_id"],
                        word=phrase_text,
                        lemma=" ".join(lemmas) if lemmas else phrase_text,
                        sentence_id=source.get("sentence_id", -1),
                        pos=" ".join(pos_tags) if pos_tags else "",
                        left_context=source.get("left_context", ""),
                        right_context=source.get("right_context", ""),
                        metadata=source.get("metadata", {}),
                        score=hit.get("_score", 0.0),
                        position_start=source.get("position_start"),
                        position_end=source.get("position_end")
                    ))

            return SearchResponse(
                total=total,
                page=page,
                page_size=page_size,
                results=results,
                query=query,
                mode=mode,
                search_type=search_type,
                slop=slop,
                fuzziness=fuzziness if search_type == "fuzzy" else "0"
            )

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/suggest")
async def suggest(
        prefix: str = Query(..., min_length=2),
        field: str = Query("word", description="Field to suggest from"),
        size: int = Query(10, le=20),
        es: ElasticsearchClient = Depends(get_es)
):
    try:
        body = {
            "suggest": {
                "word_suggest": {
                    "prefix": prefix,
                    "completion": {
                        "field": f"suggest.{field}",
                        "size": size,
                        "fuzzy": {
                            "fuzziness": "AUTO"
                        }
                    }
                }
            }
        }
        
        result = await es.client.search(
            index=es.index_name,
            body=body
        )
        
        suggestions = []
        for option in result["suggest"]["word_suggest"][0]["options"]:
            suggestions.append(option["text"])
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"Suggest error: {e}")
        return {"suggestions": []}