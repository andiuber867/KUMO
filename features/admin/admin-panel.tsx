'use client';
import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, Upload, QrCode, ExternalLink, Search, Loader2, Download, SlidersHorizontal } from 'lucide-react';
import QRCode from 'qrcode';
import { Brand } from '@/components/brand';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { Toaster,toast } from 'sonner';
import { Product,categories } from '@/features/products/types';

type SortOption = 'recent' | 'new' | 'available' | 'name' | 'price_asc' | 'price_desc';

const blank:Product={id:'',name:'',description:'',category:'Sushi',price:0,image:'',isNew:false,available:true,portion:''};
async function api(url:string,method:string,body?:unknown){const r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json() as {error?:string;products:Product[]};if(!r.ok)throw Error(data.error||'No se pudo completar la acción.');return data;}

export function AdminPanel({username}:{username:string}){
 const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[sortBy,setSortBy]=useState<SortOption>('recent'),[editing,setEditing]=useState<Product|null>(null),[deleting,setDeleting]=useState<Product|null>(null),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[formError,setFormError]=useState(''),[qr,setQr]=useState(''),[qrOpen,setQrOpen]=useState(false),[qrUrl,setQrUrl]=useState(''),[togglingId,setTogglingId]=useState<string|null>(null);
 async function load(){try{const d=await api('/api/products','GET');setProducts(d.products);setError('')}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function logout(){setBusy(true);try{await api('/api/auth/logout','POST');window.location.replace('/')}catch(e){toast.error((e as Error).message);setBusy(false)}}
 function notifyCatalog(){if('BroadcastChannel' in window){const channel=new BroadcastChannel('kumo-catalog');channel.postMessage('changed');channel.close()}}
 function edit(p:Product){setFormError('');setEditing({...p})}
 async function toggleAvailability(p:Product){
   if(togglingId===p.id)return;
   const nextAvailable=!p.available;
   setTogglingId(p.id);
   setProducts(prev=>prev.map(item=>item.id===p.id?{...item,available:nextAvailable}:item));
   try{
     await api('/api/products/'+p.id,'PUT',{...p,available:nextAvailable});
     notifyCatalog();
     toast.success(`"${p.name}" ${nextAvailable?'marcado como disponible':'marcado como agotado'}.`);
   }catch(e){
     setProducts(prev=>prev.map(item=>item.id===p.id?{...item,available:p.available}:item));
     toast.error((e as Error).message||'No se pudo cambiar la disponibilidad.');
   }finally{
     setTogglingId(null);
   }
 }
 async function save(e:FormEvent){e.preventDefault();if(!editing||busy||uploading)return;setBusy(true);setFormError('');try{await api(editing.id?'/api/products/'+editing.id:'/api/products',editing.id?'PUT':'POST',editing);await load();notifyCatalog();setEditing(null);toast.success('Producto guardado en la carta.')}catch(e){setFormError((e as Error).message)}finally{setBusy(false)}}
 async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
   return new Promise((resolve) => {
     if (file.type === 'image/svg+xml' || file.size < 50 * 1024) return resolve(file);
     const reader = new FileReader();
     reader.onload = (e) => {
       const img = new Image();
       img.onload = () => {
         let { width, height } = img;
         if (width > maxWidth) {
           height = Math.round((height * maxWidth) / width);
           width = maxWidth;
         }
         const canvas = document.createElement('canvas');
         canvas.width = width;
         canvas.height = height;
         const ctx = canvas.getContext('2d');
         if (!ctx) return resolve(file);
         ctx.drawImage(img, 0, 0, width, height);
         canvas.toBlob(
           (blob) => {
             if (!blob || blob.size >= file.size) return resolve(file);
             resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', { type: 'image/webp' }));
           },
           'image/webp',
           quality
         );
       };
       img.onerror = () => resolve(file);
       img.src = e.target?.result as string;
     };
     reader.onerror = () => resolve(file);
     reader.readAsDataURL(file);
   });
 }
 async function upload(file?:File){if(!file)return;setUploading(true);setFormError('');try{const optimized=await compressImage(file);if(optimized.size>5*1024*1024)throw Error('La foto debe pesar menos de 5 MB.');const data=new FormData();data.set('file',optimized);const r=await fetch('/api/uploads',{method:'POST',body:data});const d=await r.json() as {error?:string;url:string};if(!r.ok)throw Error(d.error||'No se pudo subir la imagen.');setEditing(p=>p?{...p,image:d.url}:p)}catch(e){setFormError((e as Error).message)}finally{setUploading(false)}}
 async function remove(){if(!deleting)return;setBusy(true);try{await api('/api/products/'+deleting.id,'DELETE');await load();notifyCatalog();setDeleting(null);toast.success('Producto eliminado.')}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
 async function showQR(){try{const url=window.location.origin+'/menu';setQrUrl(url);setQr(await QRCode.toDataURL(url,{width:1000,margin:4,color:{dark:'#121313',light:'#ffffff'}}));setQrOpen(true)}catch{toast.error('No se pudo generar el QR.')}}

 const filtered = products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
 const visible = [...filtered].sort((a,b)=>{
   if(sortBy==='recent') return (b.createdAt||0)-(a.createdAt||0);
   if(sortBy==='new'){
     if(a.isNew!==b.isNew) return (b.isNew?1:0)-(a.isNew?1:0);
     return (b.createdAt||0)-(a.createdAt||0);
   }
   if(sortBy==='available'){
     if(a.available!==b.available) return (b.available?1:0)-(a.available?1:0);
     return (b.createdAt||0)-(a.createdAt||0);
   }
   if(sortBy==='name') return a.name.localeCompare(b.name);
   if(sortBy==='price_asc') return a.price - b.price;
   if(sortBy==='price_desc') return b.price - a.price;
   return (b.createdAt||0)-(a.createdAt||0);
 });

 return <div className="admin-shell"><Toaster richColors position="top-center"/><header className="admin-header"><Brand/><div><span className="admin-label">ADMINISTRACIÓN</span><a className="outline-button" href="/menu" target="_blank" rel="noreferrer">Ver carta <ExternalLink size={15}/></a></div></header><main className="admin-main"><div className="admin-title"><div><div className="eyebrow">ESPACIO KUMO</div><h1>Tu carta, al día.</h1><p>Agrega, edita y organiza los platos que ven tus clientes.</p></div><div className="admin-actions"><button className="outline-button" onClick={showQR}><QrCode size={17}/> Código QR</button><button className="primary-button" onClick={()=>edit(blank)}><Plus size={18}/> Agregar producto</button></div></div><div className="stats"><div><span>Productos en carta</span><strong>{products.length.toString().padStart(2,'0')}</strong></div><div><span>Disponibles</span><strong>{products.filter(p=>p.available).length.toString().padStart(2,'0')}</strong></div><div><span>Novedades en carta</span><strong>{products.filter(p=>p.isNew).length.toString().padStart(2,'0')}</strong></div></div>
 {error&&<div role="alert" className="error-banner">{error} <button onClick={load}>Reintentar</button></div>}
 <div className="admin-list-heading">
   <h2>Productos <span>{products.length}</span></h2>
   <div className="admin-list-controls">
     <div className="sort-select-wrapper">
       <SlidersHorizontal size={14} className="sort-icon"/>
       <Select value={sortBy} onValueChange={(val:SortOption)=>setSortBy(val)}>
         <SelectTrigger className="sort-trigger" aria-label="Ordenar productos">
           <SelectValue placeholder="Ordenar por"/>
         </SelectTrigger>
         <SelectContent className="sort-popover">
           <SelectItem value="recent">Últimos editados</SelectItem>
           <SelectItem value="new">Novedades primero</SelectItem>
           <SelectItem value="available">Disponibles primero</SelectItem>
           <SelectItem value="name">Nombre (A-Z)</SelectItem>
           <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
           <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
         </SelectContent>
       </Select>
     </div>
     <label className="search"><Search size={18}/><input placeholder="Buscar producto…" aria-label="Buscar producto" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   </div>
 </div>
 {loading?<p role="status">Cargando productos…</p>:visible.length?<div className="admin-products">{visible.map(p=><article key={p.id} className="admin-product"><img src={p.image||'/kumo-logo.jpg'} alt={p.name}/><div className="admin-product-info"><div className="product-meta">{p.category} {p.isNew&&<span className="inline-new">✦ Nuevo</span>}</div><h3>{p.name}</h3><p>{p.portion||'Sin porción indicada'}</p></div><strong className="admin-price">Bs {p.price.toFixed(2)}</strong><button type="button" className={`availability ${!p.available?'off':''}`} onClick={()=>toggleAvailability(p)} disabled={togglingId===p.id} title="Haz clic para cambiar disponibilidad">{togglingId===p.id?<Loader2 className="spin" size={14}/>:(p.available?'Disponible':'Agotado')}</button><div className="row-actions"><button className="icon-button" aria-label={'Editar '+p.name} onClick={()=>edit(p)}><Pencil size={18}/></button><button className="icon-button danger" aria-label={'Eliminar '+p.name} onClick={()=>setDeleting(p)}><Trash2 size={18}/></button></div></article>)}</div>:<div className="empty-state"><h3>{query?'No encontramos ese producto.':'Todo empieza con un buen plato.'}</h3><p>{query?'Prueba con otro nombre.':'Agrega tu primer producto con una foto, descripción y precio.'}</p>{!query&&<button className="primary-button" onClick={()=>edit(blank)}>Agregar primer producto</button>}</div>}
 </main><div className="admin-footer"><span>Sesión: {username}</span><button onClick={logout} disabled={busy}>Cerrar sesión</button></div>
 <Dialog open={!!editing} onOpenChange={open=>{if(!open&&!busy&&!uploading)setEditing(null)}}><DialogContent className="editor-dialog"><DialogTitle className="editor-title">{editing?.id?'Editar producto':'Un nuevo sabor'}</DialogTitle><DialogDescription>Completa los detalles que verán tus clientes.</DialogDescription>{editing&&<form onSubmit={save} className="product-form"><div className="photo-editor">{editing.image?<img src={editing.image} alt="Foto del producto"/>:<div className="photo-placeholder"><Upload size={26}/><span>La primera impresión cuenta.</span></div>}<label className="upload-label">{uploading?<><Loader2 className="spin" size={16}/> Subiendo…</>:<><Upload size={16}/> {editing.image?'Cambiar foto':'Subir fotografía'}</>}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||uploading} onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/></label><small>JPG, PNG o WebP · hasta 5 MB</small></div><label>Nombre del producto<input required minLength={2} maxLength={100} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="Ej. Kumo signature roll"/></label><div className="form-row"><div className="form-field"><label htmlFor="category">Categoría</label><Select value={editing.category} onValueChange={category=>setEditing({...editing,category})}><SelectTrigger id="category" className="category-select"><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><label>Precio (Bs)<input type="number" min="0" max="100000" step="0.01" required value={Number.isNaN(editing.price)?"":editing.price} onChange={e=>setEditing({...editing,price:e.target.value===''?NaN:Number(e.target.value)})}/></label></div><label>Descripción<textarea rows={3} maxLength={700} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="Ingredientes y detalles que hacen especial este plato."/></label><label>Porción<input maxLength={60} value={editing.portion} onChange={e=>setEditing({...editing,portion:e.target.value})} placeholder="Ej. 8 piezas, 1 bowl, 350 ml"/></label><div className="switch-row"><div><label htmlFor="new-product">Marcar como nuevo <span>✦</span></label><p>Se destacará con una etiqueta en la carta.</p></div><Switch id="new-product" checked={editing.isNew} onCheckedChange={isNew=>setEditing({...editing,isNew})}/></div><div className="switch-row"><div><label htmlFor="available-product">Disponible</label><p>Desactívalo si se agotó por hoy.</p></div><Switch id="available-product" checked={editing.available} onCheckedChange={available=>setEditing({...editing,available})}/></div>{formError&&<p role="alert" className="error-banner">{formError}</p>}<div className="form-actions"><button type="button" className="outline-button" disabled={busy||uploading} onClick={()=>setEditing(null)}>Cancelar</button><button className="primary-button" disabled={busy||uploading} type="submit">{busy?'Guardando…':'Guardar producto'}</button></div></form>}</DialogContent></Dialog>
 <AlertDialog open={!!deleting} onOpenChange={open=>!open&&!busy&&setDeleting(null)}><AlertDialogContent><AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle><AlertDialogDescription>“{deleting?.name}” se quitará de la carta. Esta acción no se puede deshacer.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><button className="primary-button" onClick={remove} disabled={busy}>{busy?'Eliminando…':'Eliminar producto'}</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <Dialog open={qrOpen} onOpenChange={setQrOpen}><DialogContent className="qr-dialog"><DialogTitle className="editor-title">La carta, en un escaneo.</DialogTitle><DialogDescription>Descarga el código para colocarlo en las mesas. El enlace se mantiene cuando cambias tus productos.</DialogDescription>{qr&&<img className="qr-image" src={qr} alt="Código QR de la carta de KUMO"/>}<p className="qr-url">{qrUrl}</p><a className="primary-button" href={qr} download="kumo-menu-qr.png"><Download size={17}/> Descargar QR</a><p className="allergen-note">Comprueba que el sitio esté público antes de imprimir. Un QR del entorno local solo funciona en este equipo.</p></DialogContent></Dialog>
 </div>
}
