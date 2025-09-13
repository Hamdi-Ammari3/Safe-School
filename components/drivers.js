import React, { useState,useEffect } from 'react'
import Image from 'next/image'
import { doc,collection,writeBatch,Timestamp,addDoc,updateDoc,setDoc } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import 'react-datepicker/dist/react-datepicker.css'
import { Modal } from "antd"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { FiPlusSquare } from "react-icons/fi"
import imageNotFound from '../images/NoImage.jpg'

const Drivers = () => {
  const { drivers } = useGlobalState()

  const storedDashboardName = localStorage.getItem("adminDahboardName");

  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [driverPhoneNumber, setDriverPhoneNumber] = useState('')
  const [carTypeFilter, setCarTypeFilter] = useState('')
  const [driverIDFilter, setDriverIDFilter] = useState('')
  const [linesNumberSortDirection, setLinesNumberSortDirection] = useState(null)
  const [openAddingNewDriverModal, setOpenAddingNewDriverModal] = useState(false)
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverFamilyName, setNewDriverFamilyName] = useState('')
  const [newDriverPhoneNumber, setNewDriverPhoneNumber] = useState('')
  const [newDriverBirthDate, setNewDriverBirthDate] = useState('')
  const [newDriverHomeAddress, setNewDriverHomeAddress] = useState('')
  const [newDriverHomeLocation, setNewDriverHomeLocation] = useState('')
  const [newDriverCarType, setNewDriverCarType] = useState('')
  const [newDriverCarModal, setNewDriverCarModal] = useState('')
  const [newDriverCarPlate, setNewDriverCarPlate] = useState('')
  const [newDriverCarSeats, setNewDriverCarSeats] = useState(0)
  const [addingNewDriverLoading, setAddingNewDriverLoading] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedLine, setExpandedLine] = useState(null)
  const [schoolControlType,setSchoolControlType] = useState(false)

  useEffect(() => {
    const fullControl = JSON.parse(localStorage.getItem('fullControl'))
    setSchoolControlType(fullControl)
  }, []);
  
  // Filtered drivers based on search term
  const filteredDrivers = drivers.filter((driver) => {
    // Filter by name
    const matchesName = driverNameFilter === '' || driver.full_name.includes(driverNameFilter)

    //Filter by phone number
    const matchesPhoneNumber = driverPhoneNumber === '' || driver.phone_number.includes(driverPhoneNumber)

    // Filter by car type
    const matchesCarType = carTypeFilter === '' || driver.car_type === carTypeFilter;

    // Filter driver id 
    const matchesID = driverIDFilter === '' || driver.id.includes(driverIDFilter)
    
    return matchesName && matchesPhoneNumber && matchesCarType && matchesID;
  })
  .sort((a, b) => {
    if (linesNumberSortDirection === 'asc') {
      return a.lines.length === '-' ? 1 : b.lines.length === '-' ? -1 : a.lines.length - b.lines.length;
    } else if (linesNumberSortDirection === 'desc') {
      return a.lines.length === '-' ? 1 : b.lines.length === '-' ? -1 : b.lines.length - a.lines.length;
    }
    return 0;
  });
    
  // Filter by driver name
  const handleNameChange = (e) => {
    setDriverNameFilter(e.target.value);
  };

  // Handle driver phone number change
  const handlePhoneNumberChange = (e) => {
    setDriverPhoneNumber(e.target.value);
  };

  // Filter by driver car type
  const handleCarTypeChange = (e) => {
    setCarTypeFilter(e.target.value);
  };

  // Filter drivers by highest lines number
  const handleSortByHighestLinesNumber = () => {
    setLinesNumberSortDirection('desc');
  };
  
  // Filter drivers by lowest lines number
  const handleSortByLowestLinesNumber = () => {
    setLinesNumberSortDirection('asc');
  };

  // Handle back action
  const goBack = () => {
    setSelectedDriver(null)
    setExpandedLine(null)
  };

  // Open line riders list
  const toggleLine = (index) => {
    setExpandedLine((prev) => (prev === index ? null : index));
  }

  // Open create new rider modal
  const handleOpenCreateNewDriverModal = () => {
    setOpenAddingNewDriverModal(true)
  }

  // Close create new rider modal
  const handleCloseCreateNewDriverModal = () => {
    setOpenAddingNewDriverModal(false)
  }

  // Lines Cars type
  const carsList = [
    { name: 'صالون', seats: 4 },
    { name: 'ميني باص ١٢ راكب', seats: 12 },
    { name: 'ميني باص ١٨ راكب', seats: 18 },
    { name: '٧ راكب (جي ام سي / تاهو)', seats: 7 }
  ]

  // Set car seats from car type
  const handleCarChange = (carType) => {
    setNewDriverCarType(carType);

    const selectedCar = carsList.find((car) => car.name === carType);
    if (selectedCar) {
      setNewDriverCarSeats(selectedCar.seats);
    } else {
      setNewDriverCarSeats(0);
    }
  }

  // Create new driver
  const createNewDriverHandler = async () => {
    if (!newDriverName || !newDriverFamilyName || !newDriverBirthDate || !newDriverHomeLocation || !newDriverHomeAddress ||
        !newDriverPhoneNumber || !newDriverCarType || !newDriverCarModal || !newDriverCarPlate || !newDriverCarSeats) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setAddingNewDriverLoading(true);

      const phoneNumber = `+964${newDriverPhoneNumber}`;  // Prod phone
      //const phoneNumber = `+1${newDriverPhoneNumber}`;  // Test Phone
      const clerkUsername = `user_${newDriverPhoneNumber}`;
      const HARDCODED_PASSWORD = "SecurePass1234!";

      // 🔹 Step 1: Ask backend to check/create Clerk user
      const res = await fetch("/api/create-user", {
        method: "POST",
        body: JSON.stringify({ username: clerkUsername, password: HARDCODED_PASSWORD }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clerk request failed");

      const { user, alreadyExists } = data;
      const userId = user.id;

      // 🔹 Step 2: If Clerk user already exists, block creation
      if (alreadyExists) {
        alert("سائق مسجل مسبقًا بهذا الرقم، لا يمكن إنشاء حساب جديد 🚫");
        setAddingNewDriverLoading(false);
        return;
      }

      // 🔹 Step 2: Birth date → Firestore timestamp
      let birthTimestamp = null;
      try {
        birthTimestamp = Timestamp.fromDate(new Date(newDriverBirthDate));
      } catch (err) {
        console.error("خطأ في صيغة تاريخ الميلاد:", err);
        alert("صيغة تاريخ الميلاد غير صالحة");
        setAddingNewDriverLoading(false);
        return;
      }

      // 🔹 Step 3: Parse home location input
      let homeLocationObj = null;
      if (newDriverHomeLocation) {
        const [lat, lng] = newDriverHomeLocation.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          homeLocationObj = { latitude: lat, longitude: lng };
        }
      }

      // 🔹 Step 3: Create Firestore User doc
      const userRef = doc(DB, "users", userId);
      await setDoc(userRef, {
        user_full_name: newDriverName,
        user_family_name: newDriverFamilyName,
        compte_owner_type: "driver",
        account_balance: 0,
        intercityTrips: [],
        riders: [],
        driver_doc: null,
        trips_canceled: 0,
        phone_number: phoneNumber,
        user_notification_token: null,
        user_privacy_policy: true,
        user_terms_of_use: true,
        user_signup_date: new Date(),
      });

      // 🔹 Step 4: Create Driver doc
      const newDriver = {
        full_name: newDriverName,
        family_name: newDriverFamilyName,
        user_doc_id: userId,
        service_type: 'خطوط',
        balance: 0,
        trips_canceled: 0,
        birth_date: birthTimestamp,
        phone_number: phoneNumber,
        notification_token: null,
        current_location: homeLocationObj,
        home_location: homeLocationObj,
        home_address: newDriverHomeAddress,
        car_type: newDriverCarType,
        car_model: newDriverCarModal,
        car_plate: newDriverCarPlate,
        car_seats: Number(newDriverCarSeats),
        personal_image: null,
        car_image: null,
        lines: [],
        intercityTrips: [],
        riders_rating: [],
        team_rating: [],
      };

      const driverRef = await addDoc(collection(DB, "drivers"), newDriver);

      // 🔹 Step 5: Attach driver ID to User doc
      await updateDoc(userRef, { driver_doc: driverRef.id });

      alert("تم انشاء حساب السائق بنجاح ✅")

    } catch (err) {
      alert("خطأ اثناء اضافة سائق جديد")
      console.error("Error creating driver:", err)
    } finally {
      setAddingNewDriverLoading(false)
      setOpenAddingNewDriverModal(false)
      setNewDriverName("")
      setNewDriverFamilyName("")
      setNewDriverPhoneNumber('')
      setNewDriverBirthDate('')
      setNewDriverHomeAddress('')
      setNewDriverHomeLocation('')
      setNewDriverCarType('')
      setNewDriverCarModal('')
      setNewDriverCarPlate('')
      setNewDriverCarSeats(0)
    }
  }

  //Delete driver document from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا السائق");
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const batch = writeBatch(DB);
      const driverRef = doc(DB, "drivers", selectedDriver.id);
      const userRef = doc(DB, "users", selectedDriver.user_doc_id);

      // Check if the driver has lines
      if (selectedDriver.lines.length > 0) {
        alert("لا يمكن حذف السائق لأنه لا يزال لديه خطوط في حسابه");
        setIsDeleting(false);
        return;
      }

      // 1. Delete rider document
      batch.delete(driverRef);

      // 2. Remove driver id from user driver_doc
      batch.update(userRef, {
        driver_doc:null
      });

      // Commit the batch update
      await batch.commit();
      setSelectedDriver(null)

      alert("تم الحذف بنجاح، وتم تحديث بيانات الطلاب المرتبطين بالسائق.");
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Toggle between lines or intercity trips
  const renderToggle = () => (
    <div className='toggle-between-school-company-container'>
      <div className='students-section-inner-title' style={{ width: '250px' }}>
        <input
          placeholder='رمز السائق'
          type='text'
          value={driverIDFilter}
          onChange={(e) => setDriverIDFilter(e.target.value)}
          style={{ width: '250px', fontSize: '15px' }}
        />
      </div>
      {schoolControlType && (
      <div className='students-section-inner-title' style={{ width: '150px' }}>
        <button
          onClick={handleOpenCreateNewDriverModal}
          className='confirm-edit-time-table-button'
          style={{ width: '130px' }}
        >
          انشاء حساب سائق
        </button>
        <Modal
          title='انشاء حساب سائق'
          open={openAddingNewDriverModal}
          onCancel={handleCloseCreateNewDriverModal}
          centered
          footer={null}
        >
          <div className='creating-new-line-modal'>
            <div className='creating-new-line-form' style={{ marginTop: '10px' }}>
              <div className='students-section-inner-title'>
                <input
                  placeholder='الاسم'
                  type='text'
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='اللقب'
                  type='text'
                  value={newDriverFamilyName}
                  onChange={(e) => setNewDriverFamilyName(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='تاريخ الميلاد'
                  type='date'
                  value={newDriverBirthDate}
                  onChange={(e) => setNewDriverBirthDate(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='عنوان المنزل'
                  type='text'
                  value={newDriverHomeAddress}
                  onChange={(e) => setNewDriverHomeAddress(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='احداثيات المنزل'
                  type='text'
                  value={newDriverHomeLocation}
                  onChange={(e) => setNewDriverHomeLocation(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title' style={{ gap: '10px' }}>
                <div className='phone-number-country-code'>
                  <h5>+964</h5>
                </div>
                <input
                  placeholder='رقم الهاتف'
                  type='text'
                  value={newDriverPhoneNumber}
                  onChange={(e) => setNewDriverPhoneNumber(e.target.value)}
                  style={{ width: '190px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <select
                  value={newDriverCarType}
                  onChange={(e) => handleCarChange(e.target.value)}
                  style={{ width: '250px' }}
                >
                  <option value=''>نوع السيارة</option>
                  {carsList.map((car) => (
                    <option key={car.name} value={car.name}>
                      {car.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='موديل السيارة'
                  type='text'
                  value={newDriverCarModal}
                  onChange={(e) => setNewDriverCarModal(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='رقم اللوحة'
                  type='text'
                  value={newDriverCarPlate}
                  onChange={(e) => setNewDriverCarPlate(e.target.value)}
                  style={{ width: '250px' }}
                />
              </div>
              {addingNewDriverLoading ? (
                <div className='confirm-edit-time-table-button' style={{ marginTop: '10px' }}>
                  <ClipLoader
                    color={'#fff'}
                    loading={addingNewDriverLoading}
                    size={10}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              ) : (
                <button
                  onClick={createNewDriverHandler}
                  disabled={addingNewDriverLoading}
                  className='confirm-edit-time-table-button'
                  style={{ marginTop: '10px' }}
                >
                  انشاء
                </button>
              )}
            </div>
          </div>
        </Modal>
      </div>
      )}
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedDriver ? (
        <div className='students-section-inner'>
          {renderToggle()}
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input 
                onChange={handleNameChange} 
                value={driverNameFilter}
                placeholder='الاسم' 
                type='text' 
                className='students-section-inner-title_search_input'
              />
            </div>
            <div className='students-section-inner-title'>
              <input 
                onChange={handlePhoneNumberChange} 
                value={driverPhoneNumber}
                placeholder='رقم الهاتف' 
                type='text' 
              />
            </div>
            <div className='students-section-inner-title'>
              <select
                onChange={handleCarTypeChange}
                value={carTypeFilter}
                style={{width:'230px'}}
              >
                <option value=''>نوع السيارة</option>
                <option value='صالون'>صالون</option>
                <option value='ميني باص ١٢ راكب'>ميني باص ١٢ راكب</option>
                <option value='ميني باص ١٨ راكب'>ميني باص ١٨ راكب</option>
                <option value='٧ راكب (جي ام سي / تاهو)'>٧ راكب (جي ام سي / تاهو)</option>
              </select>
            </div>
            <div className='students-section-inner-title' style={{width:'200px'}}>
              <div className='driver-rating-box' style={{width:'130px'}}>
                <button onClick={handleSortByLowestLinesNumber}>
                  <FaCaretDown 
                    size={18} 
                    className={linesNumberSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
                  />
                </button>
                <h5>عدد الخطوط</h5>
                <button onClick={handleSortByHighestLinesNumber}>
                  <FaCaretUp 
                    size={18}
                    className={linesNumberSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
                  />
                </button>
              </div>
            </div>
          </div>
          <div className='all-items-list'>
            {filteredDrivers.map((driver, index) => (
              <div key={index} onClick={() => setSelectedDriver(driver)} className='single-item'>
                <div>
                  <h5>{driver.full_name} {driver.family_name}</h5>
                </div>
                <div>
                  <h5>{driver.phone_number}</h5>
                </div>
                <div>
                  <h5>{driver.car_type}</h5>
                </div>
                <div style={{width:'200px'}}>
                  <h5>{driver?.lines?.filter((line) => line?.destination === storedDashboardName)?.length || 0}</h5>
                </div>              
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="item-detailed-data-container">
            <div className='item-detailed-data-header'>
              <div className='item-detailed-data-header-title' style={{flexDirection:'row-reverse',gap:'5px'}}>
                <h5>{selectedDriver.full_name}</h5>
                <h5>{selectedDriver.family_name}</h5>
                <h5>-</h5>
                <h5>{selectedDriver.phone_number || '-'}</h5>  
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>
            <div className="item-detailed-data-main">
              <div className="item-detailed-data-main-firstBox">
                <div className='firstBox-image-box'>
                  <Image 
                    src={selectedDriver.personal_image ? selectedDriver.personal_image : imageNotFound}
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='personal'
                  />
                  <Image 
                    src={selectedDriver.car_image ? selectedDriver.car_image : imageNotFound} 
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='car image'
                  />
                </div>
                <div className='firstBox-text-box'>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>النوع</h5>
                    <h5>{selectedDriver.car_type || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>الموديل</h5>
                    <h5>{selectedDriver.car_model || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>اللوحة</h5>
                    <h5>{selectedDriver.car_plate || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>المعرف الخاص</h5>
                    <h5>{selectedDriver.id}</h5>
                  </div>
                  {schoolControlType && (
                    <div>
                      <h5 style={{ marginLeft: '3px' }}>حذف الحساب</h5>
                      <button
                        className="assinged-item-item-delete-button"
                        onClick={() => handleDelete()}
                        disabled={isDeleting}
                      >
                        <FcDeleteDatabase size={24} />
                      </button>
                    </div>
                  )}
                </div>           
              </div>
              <div className="item-detailed-data-main-second-box">
                <div className="assinged-item-box-title">
                  <h5>الخطوط</h5>
                </div>
                <div className="assinged-item-box-main">
                  {selectedDriver?.lines?.length ? (
                    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                      {selectedDriver?.lines.filter((line) => line.destination === storedDashboardName)
                      .map((line,index) => (
                        <div style={{ width: '100%' }} key={index}>
                          <div className="assinged-item-box-item"> 
                            <div className="assinged-item-box-item-driver-line-info">
                              <h5>{line.name}</h5>
                              <h5>-</h5>
                              <h5>{line?.riders?.length}</h5>
                              <h5>راكب</h5>
                              <h5>-</h5>
                              <h5>{line?.id}</h5>
                            </div>
                            <div className="assinged-item-box-item-buttons">
                              <button 
                                className="assinged-item-item-delete-button" 
                                onClick={() => toggleLine(index)}
                              >
                                <FiPlusSquare size={20}/>
                              </button>
                            </div>                          
                          </div>
                          {/* Dropdown for riders */}
                          <div className={`student-dropdown ${expandedLine === index ? "student-dropdown-open" : ""}`}>
                            {line?.riders?.length ? (
                              <>
                                {line.riders.map((rider) => (
                                  <div key={rider.id} className='student-dropdown-item' style={{justifyContent:'center'}}>
                                    <h5>{rider.name} {rider.family_name}</h5>
                                    <h5>-</h5>
                                    <h5>{rider.id}</h5>
                                  </div>                               
                                ))}
                              </>
                            ) : (
                              <div className='student-dropdown-item' style={{justifyContent:'center'}}>
                                <h5 className="no-students">لا يوجد طلاب في هذا الخط</h5>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{width:'100%',textAlign:'center',marginTop:'50px'}}>
                      <h5>لا يوجد خطوط</h5>
                    </div>
                  )}
                </div>     
              </div>
            </div>
          </div>   
        </>        
      )}
    </div>
  )
}

export default Drivers