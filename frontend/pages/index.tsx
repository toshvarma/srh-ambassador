import Head from 'next/head';
import Header from '../components/Header';
import { fetchStrapi } from '../lib/strapi';

export default function Home({ news = [], clubs = [] }) {
  return (
    <div>
      <Head>
        <title>SRH Ambassador</title>
      </Head>
      <Header />
      <main style={{padding:'20px'}}>
        <h1>Featured News</h1>
        <div className="grid">
          {news.map(n=> (
            <article key={n.id} className="card">
              <h3>{n.attributes.title}</h3>
              <p>{n.attributes.summary}</p>
            </article>
          ))}
        </div>
        <h2>Clubs</h2>
        <div className="grid">
          {clubs.map(c=> (
            <article key={c.id} className="card">
              <h3>{c.attributes.title}</h3>
              <p>{c.attributes.description}</p>
            </article>
          ))}
        </div>
      </main>
      <style jsx>{`
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
        .card{padding:12px;border:1px solid #ddd;border-radius:6px}
      `}</style>
    </div>
  );
}

export async function getServerSideProps(ctx){
  const locale = ctx.query.locale || 'en';
  const news = await fetchStrapi('/news?populate=*&pagination[limit]=5', {}, locale).catch(()=>({data:[]}));
  const clubs = await fetchStrapi('/clubs?populate=*&pagination[limit]=5', {}, locale).catch(()=>({data:[]}));
  return { props: { news: news.data || [], clubs: clubs.data || [] } };
}
