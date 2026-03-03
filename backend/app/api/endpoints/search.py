from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from ...core.elastic import get_es, ElasticsearchClient
from ...models.search import SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResponse)
async def search(
        query: str = Query(..., description="Search query"),
        mode: str = Query("concordance", description="Search mode: concordance, word, phrase"),
        search_type: str = Query("exact", description="Search type: exact, fuzzy, ngram"),
        field: str = Query("lemma", description="Field to search"),
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=200),
        es: ElasticsearchClient = Depends(get_es)
):
    from_ = (page - 1) * page_size

    if mode == "concordance":
        result = await es.search_concordance(
            query=query,
            field=field if search_type != "ngram" else f"{field}.ngrams",
            fuzzy=(search_type == "fuzzy"),
            from_=from_,
            size=page_size
        )
    elif mode == "word":
        stats = await es.get_word_statistics(query)
        return SearchResponse(
            total=stats.get("total_count", {}).get("value", 0),
            page=page,
            page_size=page_size,
            results=[]
        )
    else:  # phrase
        result = await es.search_ngram(
            query=query,
            field="left_context.ngrams",
            from_=from_,
            size=page_size
        )

    hits = result.get("hits", {})
    total = hits.get("total", {}).get("value", 0)

    results = []
    for hit in hits.get("hits", []):
        source = hit["_source"]
        results.append(SearchResult(
            doc_id=source["doc_id"],
            word=source["word"],
            lemma=source["lemma"],
            pos=source["pos"],
            left_context=source.get("left_context", ""),
            right_context=source.get("right_context", ""),
            metadata=source.get("metadata")
        ))

    return SearchResponse(
        total=total,
        page=page,
        page_size=page_size,
        results=results
    )