'use client'
import React,{useState,useEffect} from 'react'
import {useRouter} from 'next/navigation'
import { LoadScript } from "@react-google-maps/api"
import ClipLoader from "react-spinners/ClipLoader"
import './style.css'
import Navbar from '../components/navBar'
import Main from '../components/main'
import Riders from '../components/riders'
import Lines from '../components/lines'
import Drivers from '../components/drivers'
import DailyStatus from '../components/dailyStatus'
import Email from '../components/email'
import PrivateCarRequest from '../components/privateCarRequest'

const libraries = ['places'];

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeSection,setActiveSection] = useState('الرئيسية')
  const router = useRouter();

  // Check if admin is logged in
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!adminLoggedIn) {
      router.push('/login'); // Redirect to login page if not authenticated
    } else {
      setIsAuthenticated(true); // Allow access to the dashboard
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div style={{ width:'100vw',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <ClipLoader
        color={'#955BFE'}
        loading={!isAuthenticated}
        size={70}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
      </div>   
  )}

  
  // Function to handle select section
  const handleSectionSelect = (section) => {
    setActiveSection(section)
  }

  // Function to render section component
  const renderContent = () => {
    switch (activeSection) {
      case 'الرئيسية':
        return <Main/>
      case 'الحالة اليومية':
        return <DailyStatus/>
      case 'الطلاب' :
        return <Riders/>
      case 'الخطوط':
        return <Lines/>
      case 'السواق':
        return <Drivers/>
      case 'ارسال بلاغ':
        return <Email/>
      case 'طلب سيارات خاصة':
        return <PrivateCarRequest/>
      default:
        return <Main/>
    }
  }

  return (
    <LoadScript 
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
      libraries={libraries}
      language="ar"
      region="IQ"
    >
    <div className='dashboard-container'>
      <Navbar/>
      <div className='main-box'>
        <div className='side-box'>
          <div>
            <div
              onClick={() => handleSectionSelect('الرئيسية')}
              className={activeSection === 'الرئيسية' ? 'active':''}
            >
              <h4 >الرئيسية</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الحالة اليومية')}
              className={activeSection === 'الحالة اليومية' ? 'active':''}
            >
              <h4 >الحالة اليومية</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الطلاب')}
              className={activeSection === 'الطلاب' ? 'active':''}
            >
              <h4 >الطلاب</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الخطوط')}
              className={activeSection === 'الخطوط' ? 'active':''}
            >
              <h4>الخطوط</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('السواق')}
              className={activeSection === 'السواق' ? 'active':''}
            >
              <h4 >السواق</h4>
            </div>
            
            <div
              onClick={() => handleSectionSelect('ارسال بلاغ')}
              className={activeSection === 'ارسال بلاغ' ? 'active':''}
            >
              <h4 >ارسال بلاغ</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('طلب سيارات خاصة')}
              className={activeSection === 'طلب سيارات خاصة' ? 'active':''}
            >
              <h4 >طلب سيارات خاصة</h4>
            </div>

          </div>
        </div>
        <div className='inner-box'>
          {renderContent()}
        </div>
      </div>
    </div>
    </LoadScript>
  )
}

export default Dashboard