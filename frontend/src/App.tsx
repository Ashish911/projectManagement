import { useState } from 'react'
import './App.css'
import { Login } from './Screens/Login'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Register } from './Screens/Register'

function App() {

  return (
    <Router>
      <div className='app'>
        <Routes>
          <Route path={'/'} element={<Login currentLanguage='en'/>} />
          <Route path={'/register'} element={<Register currentLanguage='en'/>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
