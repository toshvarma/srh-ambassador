import Header from '../../components/Header';
import { fetchStrapi } from '../../lib/strapi';

export default function News({ news=[] }){
  return (
    <div>
      <Header />
      <main style={{padding:20}}>
        <h1>News</h1>
        {news.map(n=> (
          <article key={n.id} style={{borderBottom:'1px solid #eee',padding:'12px 0'}}>
            <h3>{n.attributes.title}</h3>
            <p>{n.attributes.summary}</p>
          </article>
        ))}
      </main>
    </div>
  );
}

export async function getServerSideProps(ctx){
  const locale = ctx.query.locale || 'en';
  const news = await fetchStrapi('/news?populate=*&pagination[limit]=20', {}, locale).catch(()=>({data:[]}));
  return { props: { news: news.data || [] } };
}
