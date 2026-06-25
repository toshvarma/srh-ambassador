import { fetchStrapi } from '@/lib/strapi';
import ReactMarkdown from 'react-markdown';

export default async function NewsPage() {
    const data = await fetchStrapi('/news-articles?populate=*');
    const articles = data?.data ?? [];

    return (
        <>
            <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f7f6f3;
          color: #1a1a1a;
          font-family: 'Georgia', serif;
        }

        .page-header {
          background: #1a1a1a;
          color: #f7f6f3;
          padding: 2.5rem 2rem 2rem;
          border-bottom: 4px solid #c8a84b;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-family: 'Georgia', serif;
        }

        .page-header p {
          margin-top: 0.4rem;
          font-size: 0.85rem;
          color: #aaa;
          font-family: Arial, sans-serif;
          letter-spacing: 0.05em;
        }

        .articles-list {
          max-width: 780px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .article-card {
          background: #fff;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          border-left: 4px solid #c8a84b;
        }

        .article-body {
          padding: 1.75rem 2rem;
        }

        .article-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
          font-family: Arial, sans-serif;
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .status-badge {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .status-badge.draft {
          background: #fff8e1;
          color: #f57f17;
        }

        .article-title {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .article-headline {
          font-size: 1rem;
          color: #555;
          font-style: italic;
          margin-bottom: 1.25rem;
          line-height: 1.5;
          border-bottom: 1px solid #eee;
          padding-bottom: 1rem;
        }

        .article-content img {
          max-width: 100%;
          max-height: 420px;
          width: auto;
          height: auto;
          display: block;
          margin: 1rem auto;
          border-radius: 4px;
          object-fit: cover;
        }

        .article-content p {
          font-size: 1rem;
          line-height: 1.75;
          color: #333;
          margin-bottom: 1rem;
        }

        .article-content h1,
        .article-content h2,
        .article-content h3 {
          font-family: 'Georgia', serif;
          margin: 1.5rem 0 0.5rem;
          color: #1a1a1a;
        }

        .article-content h1 { font-size: 1.4rem; }
        .article-content h2 { font-size: 1.2rem; }
        .article-content h3 { font-size: 1rem; font-style: italic; }

        .article-content strong { color: #1a1a1a; }

        .article-content a {
          color: #c8a84b;
          text-decoration: underline;
        }

        .article-content ul,
        .article-content ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .article-content li {
          line-height: 1.7;
          color: #333;
        }

        .article-author {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          font-family: Arial, sans-serif;
          font-size: 0.8rem;
          color: #999;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #999;
          font-family: Arial, sans-serif;
        }

        @media (max-width: 600px) {
          .article-body { padding: 1.25rem; }
          .article-title { font-size: 1.2rem; }
        }
      `}</style>

            <header className="page-header">
                <h1>News</h1>
                <p>{articles.length} {articles.length === 1 ? 'article' : 'articles'}</p>
            </header>

            <div className="articles-list">
                {articles.length === 0 ? (
                    <div className="empty-state">No articles published yet.</div>
                ) : (
                    articles.map((article: any) => (
                        <article className="article-card" key={article.documentId}>
                            <div className="article-body">
                                <div className="article-meta">
                  <span
                      className={`status-badge ${article.articleStatus === 'draft' ? 'draft' : ''}`}
                  >
                    {article.articleStatus ?? 'published'}
                  </span>
                                    {article.publishedAt && (
                                        <span>
                      {new Date(article.publishedAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                                    )}
                                </div>

                                <h2 className="article-title">{article.title}</h2>

                                {article.headline && (
                                    <p className="article-headline">{article.headline}</p>
                                )}

                                <div className="article-content">
                                    <ReactMarkdown>{article.content}</ReactMarkdown>
                                </div>

                                {article.username && (
                                    <p className="article-author">By {article.username}</p>
                                )}
                            </div>
                        </article>
                    ))
                )}
            </div>
        </>
    );
}