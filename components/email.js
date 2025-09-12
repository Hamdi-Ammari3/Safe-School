import React,{useState,useEffect} from 'react'
import { DB } from '../firebaseConfig'
import { collection, addDoc,serverTimestamp } from 'firebase/firestore'
import { BsSend } from "react-icons/bs";

function Email() {
  const [emailText,setEmailText] = useState('')
  const [loading, setLoading] = useState(false)
  const [schoolName,setSchoolName] = useState('')

  // Get the logged in school name
  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName');
    setSchoolName(storedName)
  }, []);

  const handleSend = async () => {
    setLoading(true);
    if (emailText.trim() !== '') {
      try {
        await addDoc(collection(DB, 'emails'), {
          sender: schoolName ,
          receiver: 'SayarTech Admin',
          messageBody: emailText,
          date: serverTimestamp(),
          status: 'unread'
        });
        setEmailText('');
        alert('تم الارسال بنجاح');
      } catch (error) {
        alert('حدث خطا ما الرجاء المحاولة مرة ثانية');
      }finally{
        setLoading(false)
      }
    }
  };
  
  return (
    <div className='white_card-section-container'>
      <div className='email-headline'>
        <h5 style={{marginLeft:'4px'}}>بلاغ من</h5>
        <h5 style={{marginLeft:'4px'}}>{schoolName}</h5>
        <h5 style={{marginLeft:'4px'}}>الى شركة</h5>
        <h5>SAFE</h5>
      </div>
      <div className='email-main'>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          placeholder='اكتب رسالتك هنا'
        />
        <button onClick={handleSend} className='send_request_button'>
          <h5>{loading ? 'جاري الارسال' : 'ارسال'}</h5>
          <BsSend className='email_send_icon' />
        </button>
      </div>
    </div>
  )
}

export default Email