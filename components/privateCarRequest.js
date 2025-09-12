import React,{useState,useEffect} from 'react'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { addDoc, collection,Timestamp } from 'firebase/firestore';
import { DB } from '../firebaseConfig'

const PrivateCarRequest = () => {

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [numberOfCars, setNumberOfCars] = useState(0);
  const [numberOfPersons, setNumberOfPersons] = useState(0);
  const [carType, setCarType] = useState(null);
  const [schoolName,setSchoolName] = useState('')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cars = [
    {label: 'سيارة صالون ٥ راكب',value: 'سيارة صالون ٥ راكب'},
    {label:'سيارة خاصة ٧ راكب',value:'سيارة خاصة ٧ راكب'},
    {label:'ستاركس',value:'ستاركس'},
    {label:'باص صغير ١٢ راكب',value:'باص صغير ١٢ راكب'},
    {label:'باص متوسط ١٤ راكب',value:'باص متوسط ١٤ راكب'},
    {label:'باص كبير ٣٠ راكب',value:'باص كبير ٣٠ راكب'}
  ]

  // Get the logged in school name
  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName');
    setSchoolName(storedName)
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !startTime || !endTime || !numberOfCars || !numberOfPersons || !carType) {
      setError('الرجاء التاكد من ادخال جميع البيانات');
      return;
    }
    setError('');
    setLoading(true);
  
    // Combine the selected date with the times for accurate datetime storage
    const combinedStartTime = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    );
    
    const combinedEndTime = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      endTime.getHours(),
      endTime.getMinutes()
    );
  
    try {
      await addDoc(collection(DB, 'carRequest'), {
        sender:schoolName,
        startDate: Timestamp.fromDate(new Date(startDate.setHours(0, 0, 0, 0))),
        endDate: Timestamp.fromDate(new Date(endDate.setHours(0, 0, 0, 0))),
        startTime: Timestamp.fromDate(combinedStartTime),
        endTime: Timestamp.fromDate(combinedEndTime),
        numberOfCars,
        numberOfPersons,
        carType: carType.value,
        request_send_date: Timestamp.fromDate(new Date()),
      });
      alert('تم ارسال الطلب بنجاح');
      setStartDate(null);
      setEndDate(null)
      setStartTime(null);
      setEndTime(null);
      setNumberOfCars(0);
      setNumberOfPersons(0);
      setCarType(null);
    } catch (err) {
      alert('حدث خطا ما الرجاء المحاولة مرة ثانية');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className='white_card-section-container'>
      <div className='private_car_request_header'>
        <h4>طلب سيارات خاصة</h4>
      </div>
      <div className='private_car_request_form_div'>
      <form onSubmit={handleSubmit} className='private_car_request_form'>
        <div className='private_car_request_form_date'>

          <div className='private_car_request_form_date_day'>
          <div>
            <DatePicker 
            selected={startDate} 
            onChange={(date) => setStartDate(date)} 
            className='private_car_request_form_date_day_input'
            placeholderText= 'من يوم'
            />
          </div>
          <div>
            <DatePicker 
            selected={endDate} 
            onChange={(date) => setEndDate(date)} 
            className='private_car_request_form_date_day_input'
            placeholderText= 'الى يوم'
            />
          </div>
          </div>

          <div className='private_car_request_form_date_day'>
          <div>
            <DatePicker
              selected={startTime}
              onChange={(time) => setStartTime(time)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Start Time"
              dateFormat="h:mm aa"
              className='private_car_request_form_date_day_input'
              placeholderText='وقت الحضور'
            />
          </div>
          <div>
            <DatePicker
              selected={endTime}
              onChange={(time) => setEndTime(time)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="End Time"
              dateFormat="h:mm aa"
              className='private_car_request_form_date_day_input'
              placeholderText='وقت المغادرة'
            />
          </div>
          </div>
          
        </div>
        
        <div className='private_car_request_form_car'>
          
          <div className='private_car_request_form_car_carNumber'>
            <h5>عدد الركاب</h5>
            <input
              type="number"
              value={numberOfPersons}
              onChange={(e) => setNumberOfPersons(e.target.value)}
              min="1"
              required
              className='private_car_request_form_date_day_input'
            />
          </div>

          <div className='private_car_request_form_car_carNumber'>
            <h5>عدد السيارات</h5>
            <input
              type="number"
              value={numberOfCars}
              onChange={(e) => setNumberOfCars(e.target.value)}
              min="1"
              required
              className='private_car_request_form_date_day_input'
            />
          </div>

          <div className='private_car_request_form_car_carType'>
            <Select
              value={carType}
              onChange={setCarType}
              options={cars}
              placeholder="نوع السيارات"
              className='private_car_request_form_car_carType_input'
              styles={{color:'#000'}}
            />
          </div>
        </div>
        {error && <p className='car_request_error_message'>{error}</p>}
        <div className='private_car_request_header'>
          <button type="submit" disabled={loading} className='send_request_button'>
            {loading ? (
              <h5>جاري الارسال</h5>
            ) : (
              <h5>ارسال الطلب</h5>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}

export default PrivateCarRequest