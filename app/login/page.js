"use client"
import React,{useState} from 'react'
import '../style.css'
import { useRouter } from 'next/navigation'
import { collection,getDocs,query,where } from "firebase/firestore"
import { DB } from '../../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import Image from 'next/image'
import logo_image from '../../images/safe-logo.png'

const Login = () => {
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading,setLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Query Firestore for admin credentials
      const q = query(
        collection(DB, "admins"),
        where("username", "==", username),
        where("password", "==", password) // In production, use hashed passwords
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data()
        localStorage.setItem('adminLoggedIn', true)
        localStorage.setItem('adminDahboardName', userData?.dashboard_name)
        localStorage.setItem('location', JSON.stringify(userData?.location))
        localStorage.setItem('fullControl', JSON.stringify(userData?.full_controle))
        router.push('/')
      } else {
        setError('يرجى التثبت من المعلومات المدرجة')
      }
    } catch (err) {
      setError('يرجى التثبت من المعلومات المدرجة')
    }finally {
      setLoading(false)
    }
  };

  return (
    <div className='login-container'>
      <div className='login-container-box'>
        <div className='form-title-box'>
          <Image
            src={logo_image}
            width={80}
            height={80}
            alt='logo image'
            style={{objectFit:'contain'}}
          />
        </div>
        {error && <p style={{color:'red'}}>{error}</p>}
        <div className='form-box'>
          <form className='form'>
            <input placeholder='اسم المستخدم' value={username} onChange={(e) => setUsername(e.target.value)}/>
            <input placeholder='كلمة المرور' value={password} onChange={(e) => setPassword(e.target.value)}/>
            {loading ? (
              <div style={{ width:'250px',padding:'12px 0',backgroundColor:'#955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#fff'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <button onClick={handleLogin}>دخول</button>
            )}
            
          </form>
        </div>
      </div>  
    </div>
  )
}

export default Login