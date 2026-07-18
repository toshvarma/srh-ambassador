import Header from '../../components/Header';
import { fetchStrapi } from '../../lib/strapi';

export default function Clubs({ clubs=[] }){
  return (
    <div>
      <Header />
      <main style={{padding:20}}>
        <h1>Clubs</h1>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
          {clubs.map(c=> (
            <div key={c.id} style={{border:'1px solid #ddd',padding:12,borderRadius:6}}>
              <h3>{c.attributes.title}</h3>
              <p>{c.attributes.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(ctx){
  const locale = ctx.query.locale || 'en';
  const clubs = await fetchStrapi('/clubs?populate=*&pagination[limit]=50', {}, locale).catch(()=>({data:[]}));
  return { props: { clubs: clubs.data || [] } };
}
