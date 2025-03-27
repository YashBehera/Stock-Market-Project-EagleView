import React from 'react'
import Navbar from '../components/Navbar'
import Body from '../components/Body'

export default function Home({auth_token}) {
  console.log(auth_token);
  return (
    <div>
      <Navbar token={auth_token}/>
      <Body token={auth_token}/>
    </div>
  )
}
