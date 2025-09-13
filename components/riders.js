import React,{useState,useEffect} from 'react'
import Image from 'next/image'
import { doc,collection,writeBatch,Timestamp,addDoc,arrayUnion,getDoc,setDoc,updateDoc,arrayRemove } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import haversine from 'haversine'
import { useGlobalState } from '../globalState'
import ClipLoader from "react-spinners/ClipLoader"
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { Modal } from "antd"
import { GoogleMap,Marker } from "@react-google-maps/api"
import maps from '../images/google-maps.png'

const Riders = () => {
  const { riders,lines,drivers } = useGlobalState()

  const [nameFilter,setNameFilter] = useState('')
  const [riderAgeFilter,setRiderAgeFilter] = useState()
  const [addressFilter,setAddressFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [riderIDFilter,setRiderIDFilter] = useState('')
  const [openAddingNewRiderModal,setOpenAddingNewRiderModal] = useState(false)
  const [schoolUserName,setSchoolUserName] = useState('')
  const [newRiderName,setNewRiderName] = useState('')
  const [newRiderFamilyName,setNewRiderFamilyName] = useState('')
  const [newRiderPhoneNumber,setNewRiderPhoneNumber] = useState('')
  const [newRiderBirthDate,setNewRiderBirthDate] = useState('')
  const [newRiderSex,setNewRiderSex] = useState('')
  const [newRiderHomeAddress,setNewRiderHomeAddress] = useState('')
  const [newRiderHomeLocation,setNewRiderHomeLocation] = useState('')
  const [schoolControlType,setSchoolControlType] = useState(false)
  const [destinationLocation, setDestinationLocation] = useState(null)
  const [addingNewRiderLoading,setAddingNewRiderLoading] = useState(false)
  const [selectedRider,setSelectedRider] = useState(null)
  const [isDeleting,setIsDeleting] = useState(false)
  const [isModalMapVisible,setIsModalMapVisible] = useState(false)
  const [homeCoords,setHomeCoords] = useState(null)
  const [schoolCoords,setSchoolCoords] = useState(null)
  const [distance,setDistance] = useState(null)

  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName')
    const schoolLocation = JSON.parse(localStorage.getItem('location'))
    const fullControl = JSON.parse(localStorage.getItem('fullControl'))
    setSchoolUserName(storedName)
    setDestinationLocation(schoolLocation)
    setSchoolControlType(fullControl)
  }, []);

    //Calculate student age
  const calculateAge = (birthdate) => {
    const birthDate = new Date(birthdate.seconds * 1000); // Convert Firestore Timestamp to JS Date
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
  
    // Adjust age if the current date is before the birthdate this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  };
  
  // Filtered students based on search term
  const filteredRiders  = riders.filter((rider) =>{
    //Filter by name
    const matchesName = nameFilter === '' || rider.full_name.includes(nameFilter)

    // Filter by age
    let matchesAge = true;
    if (riderAgeFilter) {
      const age = rider?.birth_date ? calculateAge(rider.birth_date) : null;
      matchesAge = age !== null && age === Number(riderAgeFilter);
    }

    //Filter by home address
    const matchesAddress = addressFilter === '' || rider.home_address.includes(addressFilter)

    //Check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && rider.line_id) || 
    (hasDriverFilter === 'false' && !rider.line_id);

    //Filter by rider id
    const matchesID = riderIDFilter === '' || rider.id.includes(riderIDFilter)

    // Return only students matching all filters
    return matchesName && matchesAge && matchesAddress && matchesDriver && matchesID;
  });

  // Handle student name change
  const handleNameFilterChange = (e) => {
    setNameFilter(e.target.value);
  };

  // Handle rider home address change
  const handleAddressChange = (e) => {
    setAddressFilter(e.target.value);
  };

  // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Select the student
  const selectRider = async (rider) => {
    setSelectedRider(rider);
  };

  // Handle back action
  const goBack = () => {
    setSelectedRider(null)
  };

  const findDriverInfoFromId = () => {
    const theDriver = drivers.find((driver) => driver.id === selectedRider.driver_id)
    if(!theDriver) {
      console.log('driver didnt exsit')
      return null;
    }
    return {
      name: theDriver.full_name,
      family_name: theDriver.family_name,
    }
  }

  const findLineInfoFromId = () => {
    const theLine = lines.find((line) => line.id === selectedRider.line_id)
    if(!theLine) {
      console.log('line didnt exsit')
      return null;
    }
    return {
      name: theLine.name,
      line_type: theLine.line_type,
    }
  }

  //Fetch home and destination location 
  useEffect(() => {
    if (selectedRider) {
      const homeLocation = selectedRider?.home_location;

      if (homeLocation && destinationLocation) {
        setHomeCoords({
          lat: homeLocation.latitude,
          lng: homeLocation.longitude,
        });
        setSchoolCoords({
          lat: destinationLocation.latitude,
          lng: destinationLocation.longitude,
        });

        // Calculate distance
        const calculatedDistance = getDistance(
          homeLocation.latitude,
          homeLocation.longitude,
          destinationLocation.latitude,
          destinationLocation.longitude
        );
        setDistance(calculatedDistance);
      }
    }
  }, [selectedRider]);

  // Haversine formula to calculate distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in kilometers
  };

  // Map Style
  const containerStyle = {
    width: '100%',
    height: '100%'
  }

  //Open Map Modal
  const handleOpenMapModal = () => {
    setIsModalMapVisible(true)
  }

  //Close Map Modal
  const handleCloseMapModal = () => {
    setIsModalMapVisible(false)
  }

  // Open create new rider modal
  const handleOpenCreateNewRiderModal = () => {
    setOpenAddingNewRiderModal(true)
  }

  // Close create new rider modal
  const handleCloseCreateNewRiderModal = () => {
    setOpenAddingNewRiderModal(false)
  }

  // Create new rider
  const createNewRiderHandler = async () => {
    if (!schoolUserName || !destinationLocation ||!newRiderName || !newRiderFamilyName || !newRiderSex || !newRiderBirthDate || !newRiderHomeAddress || 
      !newRiderHomeLocation || !newRiderPhoneNumber ) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setAddingNewRiderLoading(true);

      const phoneNumber = `+964${newRiderPhoneNumber}`; // Prod phone
      //const phoneNumber = `+1${newRiderPhoneNumber}`; // Test phone
      const clerUser = `user_${newRiderPhoneNumber}`;
      const HARDCODED_PASSWORD = "SecurePass1234!"; 

      //🔹 Step 1: Ask backend to check/create Clerk user
      const res = await fetch("/api/create-user", {
        method: "POST",
        body: JSON.stringify({ username:clerUser, password:HARDCODED_PASSWORD }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clerk request failed");

      const { user, alreadyExists } = data;
      const userId = user.id;

      // 🔹 Step 2: Birth date → Firestore timestamp
      let birthTimestamp = null;
      try {
        birthTimestamp = Timestamp.fromDate(new Date(newRiderBirthDate));
      } catch (err) {
        console.error("خطأ في صيغة تاريخ الميلاد:", err);
        alert("صيغة تاريخ الميلاد غير صالحة");
        setAddingNewRiderLoading(false);
        return;
      }

      // 🔹 Step 3: Parse home location input
      let homeLocationObj = null;
      if (newRiderHomeLocation) {
        const [lat, lng] = newRiderHomeLocation.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          homeLocationObj = { latitude: lat, longitude: lng };
        }
      }

      // 🔹 Step 4: Calculate distance
      let distanceInKm = null;
      if (homeLocationObj && destinationLocation) {
        try {
          const distance = haversine(homeLocationObj, destinationLocation, { unit: 'km' });
          distanceInKm = parseFloat(distance.toFixed(2));
        } catch (err) {
          console.error("Error calculating distance:", err);
        }
      }

      // 🔹 Step 5: Ensure Firebase User doc exists
      const userRef = doc(DB, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          user_full_name: newRiderName,
          user_family_name: newRiderFamilyName,
          compte_owner_type: "rider",
          account_balance: 0,
          intercityTrips: [],
          riders: [],
          driver_doc:null,
          trips_canceled: 0,
          phone_number: phoneNumber,
          user_notification_token: null,
          user_privacy_policy: true,
          user_terms_of_use: true,
          user_signup_date: new Date(),
        });
      }

      // 🔹 Step 6: Create Rider doc
      const newRider = {
        full_name: newRiderName,
        family_name: newRiderFamilyName,
        user_doc_id: userId,
        phone_number: phoneNumber,
        user_notification_token: null,
        birth_date: birthTimestamp,
        sex: newRiderSex,
        home_address: newRiderHomeAddress,
        home_location: homeLocationObj,
        destination:schoolUserName,
        destination_location: destinationLocation || null,
        distance: distanceInKm,
        company_commission: 0,
        driver_commission: 0,
        line_id: null,
        driver_id: null,
        trip_status: "at home",
        checked_at_home: false,
      };

      const riderRef = await addDoc(collection(DB, "riders"), newRider);

      // 🔹 Step 7: Attach Rider ID to User doc
      await updateDoc(userRef, {
        riders: arrayUnion({ id: riderRef.id }),
      });

      alert("تم انشاء حساب الراكب بنجاح ✅");
    
    } catch (err) {
      alert("خطأ اثناء اضافة راكب جديد");
      console.error("Error creating rider:", err);
    } finally {
      setAddingNewRiderLoading(false)
      setOpenAddingNewRiderModal(false)
      setNewRiderName("")
      setNewRiderFamilyName("")
      setNewRiderSex("")
      setNewRiderBirthDate("")
      setNewRiderHomeAddress("")
      setNewRiderHomeLocation("")
      setNewRiderPhoneNumber("")
    }
  }

  // Delete rider doc from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا الحساب");
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const batch = writeBatch(DB);
      const riderRef = doc(DB, 'riders', selectedRider.id);
      const userRef = doc(DB, "users", selectedRider.user_doc_id);
      
      // Check if the rider is still connected to a driver
      if (selectedRider.line_id || selectedRider.driver_id) {
        alert("لا يمكن حذف هذا الطالب لأنه لا يزال مرتبطًا بخط.");
        return;
      }

      // 1. Delete rider document
      batch.delete(riderRef)

      // 2. Remove rider id from parent user's riders array
      batch.update(userRef, {
        riders: arrayRemove({ id:selectedRider.id })
      });

      await batch.commit()
      setSelectedRider(null)

      alert("تم الحذف بنجاح")

    } catch (error) {
      console.log("خطأ أثناء الحذف:", error.message)
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Loading ...
  if(isDeleting) {
    return(
      <div style={{ width:'70vw',height:'70vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <ClipLoader
          color={'#955BFE'}
          loading={isDeleting}
          size={70}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    )
  }

  // Create new rider
  const renderAddNewLineSection = () => (
    <div className='toggle-between-school-company-container' style={{border:'none'}}>
      <div className='students-section-inner-title'>
        <input
          placeholder='رمز الراكب'
          type='text'
          value={riderIDFilter}
          onChange={(e) => setRiderIDFilter(e.target.value)}
          style={{width:'250px',fontSize:'15px'}}
        />
      </div>
      {schoolControlType && (
      <div className='students-section-inner-title'>
        <button
          onClick={handleOpenCreateNewRiderModal}
          className='confirm-edit-time-table-button'
          style={{width:'130px'}}
        >
          انشاء حساب راكب
        </button>
        <Modal
          title='انشاء حساب راكب'
          open={openAddingNewRiderModal}
          onCancel={handleCloseCreateNewRiderModal}
          centered
          footer={null}
        >
          <div className='creating-new-line-modal'>
            <div className='creating-new-line-form' style={{marginTop:'30px'}}>
              <div className='students-section-inner-title'>
                  <div className='school_user_name'>
                    <h5>{schoolUserName}</h5>
                  </div>
                </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='الاسم'
                  type='text'
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  style={{width:'250px'}}  
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='اللقب'
                  type='text'
                  value={newRiderFamilyName}
                  onChange={(e) => setNewRiderFamilyName(e.target.value)}
                  style={{width:'250px'}}  
                />
              </div>
              <div className='students-section-inner-title'>
                <select
                  value={newRiderSex}
                  onChange={(e) => setNewRiderSex(e.target.value)}
                  style={{width:'250px'}}  
                >
                  <option value=''>الجنس</option>
                  <option value='ذكر'>ذكر</option>
                  <option value='انثى'>انثى</option>
                </select>
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='تاريخ الميلاد'
                  type='date'
                  value={newRiderBirthDate}
                  onChange={(e) => setNewRiderBirthDate(e.target.value)}
                  style={{width:'250px'}}  
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='عنوان المنزل'
                  type='text'
                  value={newRiderHomeAddress}
                  onChange={(e) => setNewRiderHomeAddress(e.target.value)}
                  style={{width:'250px'}}  
                />
              </div>
              <div className='students-section-inner-title'>
                <input
                  placeholder='احداثيات المنزل'
                  type='text'
                  value={newRiderHomeLocation}
                  onChange={(e) => setNewRiderHomeLocation(e.target.value)}
                  style={{width:'250px'}}  
                />
              </div>
              <div className='students-section-inner-title' style={{gap:'10px'}}>
                <div className='phone-number-country-code'>
                  <h5>+964</h5>
                </div>
                <input
                  placeholder='رقم الهاتف'
                  type='text'
                  value={newRiderPhoneNumber}
                  onChange={(e) => setNewRiderPhoneNumber(e.target.value)}
                  style={{width:'190px'}}
                />
              </div>
              {addingNewRiderLoading ? (
                <div className='confirm-edit-time-table-button' style={{marginTop:'10px'}}>
                  <ClipLoader
                    color={'#fff'}
                    loading={addingNewRiderLoading}
                    size={10}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              ) : (
                <button
                  onClick={createNewRiderHandler}
                  disabled={addingNewRiderLoading}
                  className='confirm-edit-time-table-button'
                  style={{marginTop:'10px'}}
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

  //Render rider filter
  const renderStudentTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title' style={{width:'300px'}}>
        <input 
          onChange={handleNameFilterChange} 
          value={nameFilter}
          placeholder='الاسم' 
          type='text' 
          style={{width:'200px'}}
        />
      </div>
      <div className='students-section-inner-title' style={{width:'200px'}}>
        <input
          placeholder='العمر'
          type='number'
          value={riderAgeFilter}
          onChange={(e) => setRiderAgeFilter(e.target.value)}
          style={{width:'150px'}}
        />
      </div>
      <div className='students-section-inner-title' style={{width:'400px'}}>
        <input 
          onChange={handleAddressChange} 
          value={addressFilter}
          placeholder='العنوان' 
          type='text' 
          style={{width:'250px'}}
        />
      </div>
      <div className='students-section-inner-title' style={{width:'150px'}}>
        <select 
          onChange={handleHasDriverChange} 
          value={hasDriverFilter}
          style={{width:'100px'}}
        >
        <option value=''>لديه خط</option>
          <option value={true}>نعم</option>
          <option value={false}>لا</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedRider ? (
        <div className='students-section-inner'>
          {renderAddNewLineSection()}
          {renderStudentTitles()}
          <div>
            {filteredRiders.map((rider, index) => (
              <div key={index} onClick={() => selectRider(rider)} className='single-item' >
                <div style={{width:'300px'}}>
                  <h5>{rider?.full_name} {rider?.family_name}</h5>                         
                </div>                
                <div style={{width:'200px',display:'flex',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                  <h5>{rider?.birth_date ? calculateAge(rider?.birth_date) : '-'}</h5>
                  <h5>سنة</h5>
                </div>
                <div style={{width:'400px'}}>
                  <h5>{rider?.home_address}</h5>
                </div>
                <div style={{width:'150px'}}>
                  <h5 className={rider?.line_id ? 'student-has-driver' : 'student-without-driver'}>{rider?.line_id ? 'نعم' : 'لا'}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="item-detailed-data-container">
          <div className="item-detailed-data-header">
            <div className='item-detailed-data-header-title' style={{flexDirection:'row-reverse',gap:'5px'}}>            
              <h5>{selectedRider.full_name}</h5>
              <h5>{selectedRider.family_name}</h5>              
            </div>
            <button className="info-details-back-button" onClick={goBack}>
              <BsArrowLeftShort size={24}/>
            </button>
          </div>

          <div className="item-detailed-data-main">
            <div className="student-detailed-data-main-firstBox">
              <div>
                <h5 style={{marginLeft:'10px'}}>رقم هاتف الولي</h5>
                <h5 style={{fontWeight:'bold'}}>{selectedRider.phone_number}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'10px'}}>العمر</h5>
                <h5 style={{marginLeft:'2px',fontWeight:'bold'}}>{selectedRider.birth_date ? calculateAge(selectedRider.birth_date) : '-'}</h5>
                <h5 style={{fontWeight:'bold'}}>سنة</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'10px'}}>عنوان المنزل</h5>
                <h5 style={{marginLeft:'4px',fontWeight:'bold'}}>{selectedRider.home_address || '-'}</h5>             
                <button className="student-edit-car-type-btn" onClick={handleOpenMapModal}>
                  <Image src={maps} width={16} height={16} alt='maps'/>
                </button>
                <Modal
                  //title='موقع الطالب'
                  title={[
                    <div className='map-distance-div' key='distance'>
                      <div>
                        <p>موقع الطالب</p>
                      </div>
                      <div>
                        <h5>المسافة بين المنزل و الوجهة</h5>
                        <h5>{distance}</h5>
                        <h5>كلم</h5>
                      </div>
                      
                    </div>
                  ]}
                  open={isModalMapVisible}
                  onCancel={handleCloseMapModal}
                  footer={null}
                  centered
                >
                  <div style={{ height: '500px', width: '100%',margin:'0px' }}>
                    {homeCoords && schoolCoords ? (
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={homeCoords}
                        zoom={12}
                      >
                        <Marker 
                          position={homeCoords}
                          label={{
                            text:'المنزل',
                            color:'#000',
                            fontWeight:'bold'
                          }}
                        />
                        <Marker 
                          position={schoolCoords}
                          label={{
                            text:'المدرسة',
                            color:'#000',
                            fontWeight:'bold'
                          }}
                        />
                      </GoogleMap> 
                    ) : (
                      <h5>Loading</h5>
                    )}                   
                  </div>                     
                </Modal>
              </div>
              <div>
                <h5 style={{marginLeft:'10px'}}>المعرف الخاص</h5>
                <h5 style={{fontWeight:'bold'}}>{selectedRider.id}</h5>
              </div>
              {schoolControlType && (
                <div>
                  <h5 style={{marginLeft:'3px'}}>حذف الحساب</h5>
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

            <div className="student-detailed-data-main-second-box">
              <div className="line-driver-box" style={{marginBottom:'30px'}}>
                {selectedRider.line_id ? (
                  (() => {
                  const line = findLineInfoFromId(selectedRider.line_id);
                  return line ? (
                    <>
                      <h5 style={{fontWeight:'bold'}}>الخط</h5>
                      <h5>{line?.name}</h5>
                      <h5>{line?.line_type}</h5>
                      <h5>{selectedRider?.line_id}</h5>
                    </>        
                  ) : (
                    <h5>--</h5>
                  );
                })()
                ) : (
                  <h5 style={{color:'gray'}}>لا يوجد خط</h5>
                )}
              </div>
              <div className="line-driver-box">
                {selectedRider.driver_id ? (
                  (() => {
                  const driver = findDriverInfoFromId(selectedRider.driver_id);
                  return driver ? (
                    <>
                      <h5 style={{fontWeight:'bold'}}>السائق</h5>
                      <h5>{driver.name} {driver.family_name}</h5>
                      <h5>{selectedRider.driver_id}</h5>
                    </>              
                  ) : (
                    <h5>--</h5>
                  );
                })()
                ) : (
                  <h5 style={{color:'gray'}}>لا يوجد سائق</h5>
                )}
              </div>
            </div>
          </div>
        </div>       
      )}
    </div>
  )
}

export default Riders