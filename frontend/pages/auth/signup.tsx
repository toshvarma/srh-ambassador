import { useState } from 'react';
import Header from '../../components/Header';

export default function Signup(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [msg,setMsg]=useState('');

  async function submit(e){
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/auth/local/register`, {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username: name, email, password })
    });
    const data = await res.json();
    if (data.jwt) setMsg('Account created'); else setMsg(data.message || JSON.stringify(data));
  }

  return (
    <div>
      <Header />
      <main style={{padding:20}}>
        <h1>Sign up</h1>
        <form onSubmit={submit}>
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /><br/>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /><br/>
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><br/>
          <button type="submit">Register</button>
        </form>
        <div>{msg}</div>
      </main>
    </div>
  );
}
