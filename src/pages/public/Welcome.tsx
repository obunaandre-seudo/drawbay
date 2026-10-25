import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Img, Card, slug } from '../../ui';
import { useDb } from '../../services/api';

const HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=85';
const categories = [
  ['01', 'Homes', 'Thoughtful plans for everyday living'],
  ['02', 'Cabins', 'Small footprints, big atmosphere'],
  ['03', 'Extensions', 'Make room for what comes next'],
  ['04', 'Other projects', 'Studios, retreats and more']
];

export function Welcome() {
  const db = useDb();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const featured = db.projects.filter(p => p.status === 'published' && p.featured).slice(0, 3);
  const availableCategories = db.categories.length ? db.categories.slice(0, 4) : categories.map(([, name]) => name);
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/projects');
  };

  return <main className="home-page">
    <section className="home-hero">
      <Img src={HERO} alt="Sculptural contemporary home set among trees" className="home-hero-image" />
      <div className="home-hero-shade" />
      <div className="home-hero-copy">
        <span className="home-kicker"><i /> Architectural plans, made for what’s next</span>
        <h1>Build Better<br /><em>With Great Plans.</em></h1>
        <p>Discover, buy and download architectural plans and professional design files from independent architects and studios.</p>
        <form className="home-search" role="search" onSubmit={submitSearch}>
          <input aria-label="Search architectural plans" placeholder="Search plans, styles, or spaces" value={search} onChange={event => setSearch(event.target.value)} />
          <button type="submit">Search plans</button>
        </form>
        <nav className="home-quick-links" aria-label="Popular plan categories">
          {availableCategories.map((category, index) => <Link key={category} to={`/categories/${slug(category)}`}><span>{String(index + 1).padStart(2, '0')}</span>{category}</Link>)}
        </nav>
        <div className="home-actions"><Link className="home-button" to="/marketplace">Explore the collection <span>↗</span></Link><Link className="home-text-link" to="/seller/sign-up">For design studios <span>↗</span></Link></div>
      </div>
      <div className="home-hero-index"><span>DRAWBAY / 001</span><span>Design for living, thoughtfully.</span></div>
      <a className="home-scroll" href="#browse"><span /> Scroll to explore</a>
    </section>

    <section className="home-intro" id="browse">
      <div className="home-section-tag">01 <span>THE COLLECTION</span></div>
      <div className="home-intro-copy"><h2>Good design starts<br />with a <em>good idea.</em></h2><p>Find the starting point for your next chapter. Explore a growing collection of considered plans, each with the details to bring it to life.</p></div>
    </section>

    <section className="home-category-section">
      <div className="home-category-grid">{availableCategories.map((name, i) => {
        const item = categories.find(([, category]) => category === name) || [String(i + 1).padStart(2, '0'), name, 'Explore plans and ideas for your next project'];
        return <Link className={`home-category home-category-${i + 1}`} key={name} to={`/categories/${slug(name)}`}><span className="home-category-no">{item[0]}</span><span className="home-category-bottom"><span><strong>{name}</strong><small>{item[2]}</small></span><span className="home-category-arrow">↗</span></span></Link>;
      })}</div>
      <div className="home-category-foot"><span>Find your starting point</span><Link to="/categories">View all project types <span>↗</span></Link></div>
    </section>

    <section className="home-featured">
      <div className="home-section-heading"><div><div className="home-section-tag">02 <span>EDITOR’S PICKS</span></div><h2>Ideas worth<br /><em>coming home to.</em></h2></div><Link to="/marketplace" className="home-round-link" aria-label="Browse all plans">↗</Link></div>
      {featured.length ? <div className="home-featured-grid">{featured.map(p => <Card key={p.id} p={p} />)}</div> : <div className="home-empty"><span className="home-empty-mark">✳</span><div><h3>Fresh perspectives are on the way.</h3><p>Explore the marketplace to see the latest plans from independent studios.</p></div><Link to="/marketplace">Browse the marketplace <span>↗</span></Link></div>}
    </section>

    <section className="home-manifesto"><div className="home-section-tag">03 <span>MADE FOR WHAT’S NEXT</span></div><div className="home-manifesto-content"><span className="home-sunburst">✳</span><h2>A little more intention.<br /><em>A lot more possibility.</em></h2><div className="home-manifesto-bottom"><p>Every great space begins with a plan. Find yours, make it your own, and build a place that feels like you.</p><Link className="home-button home-button-dark" to="/marketplace">Find your plan <span>↗</span></Link></div></div></section>

    <section className="home-steps"><div className="home-section-tag">04 <span>FROM IDEA TO ADDRESS</span></div><div className="home-steps-heading"><h2>Clear steps.<br /><em>Beautiful outcomes.</em></h2><p>Everything you need to move from browsing to building.</p></div><div className="home-steps-grid"><article><span>01</span><h3>Find your vision</h3><p>Browse plans from independent designers and find a direction that feels right.</p></article><article><span>02</span><h3>Get the details</h3><p>Review project information and purchase the digital files you need.</p></article><article><span>03</span><h3>Make it yours</h3><p>Download your plans and work with your local professionals to bring them to life.</p></article></div></section>
  </main>;
}
export default Welcome;
