import React from 'react'
import './style.css'
import { Cairo } from 'next/font/google'
import { GlobalStateProvider } from '../globalState'

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  weight:['400','700'],
  display:'swap'
})

export const metadata = {
  title: "SAFE",
  description: "Iraqi transportation super app",
};


export default function RootLayout({children}) {
  return (
    <html lang="en" className={cairo.className}>
      <body id='app-container'>
        <GlobalStateProvider>
          {children}
        </GlobalStateProvider> 
      </body>
    </html>
  )
}
