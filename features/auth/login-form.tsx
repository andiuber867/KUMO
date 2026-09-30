'use client';
import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound, Loader2 } from 'lucide-react';
import { Brand } from '@/components/brand';

export function LoginForm() {
  const [visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||'No se pudo iniciar sesión.');
      window.location.href = '/';
    } catch(error) {setError(error instanceof Error?error.message:'No se pudo conectar. Intenta nuevamente.');setBusy(false)}
  }
  return <main className="kumo-login"><section className="login-story"><Brand/><div className="login-story-copy"><span className="eyebrow">DETRÁS DE CADA GRAN SABOR</span><h1>Tu cocina.<br/>Tu esencia.<br/><em>Tu KUMO.</em></h1><p>Cada plato tiene una historia.<br/>La próxima empieza contigo.</p></div><span className="login-seal" aria-hidden="true">雲</span></section><section className="login-form-side"><div className="login-card"><span className="login-lock"><LockKeyhole size={22}/></span><span className="eyebrow">ADMINISTRACIÓN</span><h2>Bienvenido a KUMO</h2><p>Ingresa para gestionar tu carta.</p><form onSubmit={login}><label htmlFor="username">Usuario</label><div className="login-input"><UserRound size={18}/><input id="username" name="username" autoComplete="username" placeholder="Tu usuario" required maxLength={100} disabled={busy}/></div><label htmlFor="password">Contraseña</label><div className="login-input"><LockKeyhole size={18}/><input id="password" name="password" type={visible?'text':'password'} autoComplete="current-password" placeholder="Tu contraseña" required maxLength={256} disabled={busy}/><button type="button" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{error&&<p className="error-banner" role="alert">{error}</p>}<button className="primary-button" disabled={busy} type="submit">{busy?<><Loader2 className="spin" size={18}/> Ingresando…</>:'Ingresar al panel'}</button></form><a className="back-link" href="/menu">Ver la carta del restaurante</a></div><span className="login-caption">KUMO · COMIDA ORIENTAL</span></section></main>;
}
