'use client';
import { useEffect, useState } from 'react';
import { Search, X, Plus, Utensils } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { categories, Product } from '@/features/products/types';

import { useMenuTools } from './use-menu-tools';
export function MenuExperience({ initialProducts = [] }: { initialProducts?: Product[] }) {
 const [products,setProducts]=useState<Product[]>(initialProducts); const [category,setCategory]=useState('Todos'); const [query,setQuery]=useState(''); const [selected,setSelected]=useState<Product|null>(null); const [loading,setLoading]=useState(initialProducts.length === 0); const [error,setError]=useState('');
 useEffect(()=>{
   let disposed=false;
   let pending=false;
   const load=async()=>{
     if(pending)return;
     pending=true;
     try{
       const response=await fetch('/api/products',{cache:'no-store'});
       if(!response.ok)throw Error();
       const data=await response.json() as {products:Product[]};
       if(!disposed){setProducts(data.products);setSelected(current=>current?data.products.find(p=>p.id===current.id)||null:null);setError('')}
     }catch{if(!disposed)setError('No pudimos actualizar la carta. Intenta recargar en un momento.')}
     finally{pending=false;if(!disposed)setLoading(false)}
   };
   load();
   const interval=setInterval(()=>{if(!document.hidden)load()},5000);
   window.addEventListener('focus',load);
   const channel='BroadcastChannel' in window?new BroadcastChannel('kumo-catalog'):null;
   if(channel)channel.onmessage=load;
   return()=>{disposed=true;clearInterval(interval);window.removeEventListener('focus',load);channel?.close()};
 },[]);
 useMenuTools(setCategory,setQuery);
 const visible=products.filter(p=>(category==='Todos'||(category==='Novedades'?p.isNew:p.category===category))&&`${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="menu-site"><header className="site-header"><Brand/><nav><a className="active" href="#carta">Nuestra carta</a><span className="header-jp">心を込めて</span></nav><span className="header-note">HECHO CON DEDICACIÓN</span></header>
 <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> JAPÓN, EN CADA BOCADO</div><h1>Pequeños detalles.<br/><em>Grandes sabores.</em></h1><p>Sushi, ramen y ese momento que quieres<br className="desktop-break"/> disfrutar un poco más.</p><a href="#carta" className="primary-button">Explorar la carta <Utensils size={16}/></a><div className="hero-foot"><span>FRESCO. ARTESANAL. KUMO.</span><span>いただきます</span></div></div><div className="hero-image"><img src="/images/sushi.jpg" alt="Selección de sushi, inspiración para la carta de KUMO"/><div className="image-shade"/><span className="vertical-kanji" aria-hidden="true">美味しい</span><div className="image-caption"><span>EL ARTE DE DISFRUTAR</span><strong>Un encuentro con Japón.</strong></div><div className="red-stamp" aria-hidden="true">雲</div></div></section>
 <section id="carta" className="menu-section"><div className="section-heading"><div><div className="eyebrow">PARA CADA ANTOJO</div><h2>Nuestra <em>carta</em><span>お品書き</span></h2></div><p>Elige tu próximo favorito.</p></div><div className="menu-toolbar"><div className="category-list" aria-label="Categorías">{['Todos',...categories,'Novedades'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)} className={category===c?'chosen':''}>{c}{c==='Novedades'&&<span className="tiny-star">✦</span>}</button>)}</div><label className="search"><Search size={18}/><input aria-label="Buscar en la carta" placeholder="¿Qué se te antoja?" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Borrar búsqueda" onClick={()=>setQuery('')}><X size={16}/></button>}</label></div>
 {loading&&<p className="catalog-loading" role="status">Preparando nuestra carta…</p>}{error&&<p role="status" className="error-banner">{error}</p>}
 <div className="product-grid" key={category+query}>{visible.map((p,i)=><button className={`product-card ${p.isNew?'new-product':''} ${!p.available?'unavailable':''}`} key={p.id} onClick={()=>setSelected(p)} style={{animationDelay:`${i*65}ms`}}><div className="product-photo"><img src={p.image||'/kumo-logo.jpg'} alt={p.name} loading="lazy"/>{p.isNew&&<span className="badge new-badge"><span className="new-sparkle" aria-hidden="true">✦</span> NUEVO</span>}{!p.available&&<span className="sold-out">No disponible hoy</span>}<span className="card-open" aria-label="Ver detalle"><Plus size={19}/></span></div><div className="product-copy"><div className="product-meta"><span>{p.category}</span><span>{p.portion}</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="card-bottom"><strong><small>Bs</small> {p.price.toFixed(2).replace('.00','')}</strong><span>Ver detalle</span></div></div></button>)}</div>{!loading&&!error&&!visible.length&&<div className="empty-state"><Utensils/><h3>{products.length?'No hay platos para esta selección':'Estamos preparando nuestra carta'}</h3>{products.length>0?<button onClick={()=>{setCategory('Todos');setQuery('')}} className="outline-button">Ver toda la carta</button>:<p>Pronto podrás descubrir nuestros platos aquí.</p>}</div>}
 </section><div className="closing-line"><span>一</span><p>El buen sabor se comparte.</p><span>一</span></div></main><footer><Brand/><p>Sushi · Ramen · Buenos momentos</p><span className="footer-note">Hecho con dedicación.</span></footer>
 <Dialog open={!!selected} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="product-dialog">{selected&&<><img className="detail-image" src={selected.image||'/kumo-logo.jpg'} alt={selected.name}/><div className="detail-copy"><span className="eyebrow">{selected.category} · {selected.portion}</span><DialogTitle className="detail-title">{selected.name}</DialogTitle><DialogDescription>{selected.description}</DialogDescription><div className="detail-footer"><strong>Bs {selected.price.toFixed(2)}</strong><span>{selected.available?'Disponible':'No disponible hoy'}</span></div><p className="allergen-note">Si tienes alguna alergia, consulta con nuestro personal antes de pedir.</p></div></>}</DialogContent></Dialog>
 </div>
}



