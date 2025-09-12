import React,{useState,useEffect,useRef} from 'react'
import { useGlobalState } from '../globalState'
import { GoogleMap,Marker } from "@react-google-maps/api"
import haversine from 'haversine'
import Image from 'next/image'
import mapImage from '../images/google_maps1.jpg'
import { doc,onSnapshot } from 'firebase/firestore'
import { DB } from '../firebaseConfig'
import { BsArrowLeftShort } from "react-icons/bs"
import { MdCheckCircle } from "react-icons/md"
import { IoMdCloseCircle } from "react-icons/io"

const DailyStatus = () => {
    const mapRef = useRef(null)
    let animatedDriverLocation = useRef(null)
    const { drivers,lines } = useGlobalState()

    const [todayDate, setTodayDate] = useState("")
    const [lineNameFilter, setLineNameFilter] = useState('')
    const [lineDriverName,setLineDriverName] = useState('')
    const [lineStartTime,setLineStartTime] = useState('')
    const [lineEndTime,setLineEndTime] = useState('')
    const [lineStatus,setLineStatus] = useState('')
    const [selectedLine,setSelectedLine] = useState(null)
    const [lineTripPhase,setLineTripPhase] = useState('first')
    const [driverLocation, setDriverLocation] = useState(null)
    const [driverOriginLocation, setDriverOriginLocation] = useState(null)
    const [mapLoading, setMapLoading] = useState(true)
   
    // Find the today date
    useEffect(() => {
        const now = new Date();
      
        const formattedDate = now.toLocaleDateString("ar-IQ", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      
        setTodayDate(formattedDate);
    }, []);

    const now = new Date();
    const yearMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = String(now.getDate()).padStart(2, '0');

    // Get line status
    const getDriverAndStatus = (line) => {
        if (!line.driver_id) return { driverName: 'بدون سائق', status: 'لم تبدأ بعد' };

        const driver = drivers.find((d) => d.id === line.driver_id);
        if (!driver) return { driverName: 'السائق غير موجود', status: 'لم تبدأ بعد' };

        const todayTracking = driver.dailyTracking?.[yearMonthKey]?.[dayKey];
        const lineTracking = todayTracking?.today_lines?.find((l) => l.id === line.id);

        // Logic to determine status
        if (!lineTracking) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'لم تبدأ بعد' };

        const firstTripStarted = lineTracking.first_phase?.phase_started;
        const firstTripFinished = lineTracking.first_phase?.phase_finished;
        const secondTripStarted = lineTracking.second_phase?.phase_started;
        const secondTripFinished = lineTracking.second_phase?.phase_finished;

        if (secondTripFinished) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة العودة انتهت' };
        if (secondTripStarted) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة العودة بدأت' };
        if (firstTripFinished) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة الذهاب انتهت' };
        if (firstTripStarted) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة الذهاب بدأت' };

        return { driverName: driver.full_name,driverFName:driver.family_name, status: 'لم تبدأ بعد' };
    }

    const getLineStatusClass = (status) => {
        switch (status) {
            case 'لم تبدأ بعد':
            return 'trip-not-started';
            case 'رحلة الذهاب بدأت':
            case 'رحلة العودة بدأت':
            return 'trip-started';
            case 'رحلة الذهاب انتهت':
            case 'رحلة العودة انتهت':
            return 'trip-finished';
            default:
            return '';
        }
    }

    // Filtered lines based on search term
    const filteredLines = lines.filter((line) => {
        const { status,driverName } = getDriverAndStatus(line);

        //check line name
        const matchesName = lineNameFilter === '' || line?.id.includes(lineNameFilter)

        //filter with line driver name
        const matchesDriverName = lineDriverName === '' || driverName.includes(lineDriverName)

        //render only lines that have driver
        const matchesDriver = !!line?.driver_id;

        //render lines that have riders
        const haveRiders = line.riders.length > 0

        // filter by start time
        const todayIndex = new Date().getDay(); // 0 = Sunday
        const todaySchedule = line.timeTable?.find(day => day.dayIndex === todayIndex);
        const isActiveToday = todaySchedule?.active === true;
        const todayStartTimeObj = line.timeTable?.[todayIndex]?.startTime;
        const todayEndTimeObj = line.timeTable?.[todayIndex]?.endTime;

        // Extract the hour from the Firestore timestamp
        let lineStartHour = null;
        if (todayStartTimeObj?.toDate) {
            lineStartHour = todayStartTimeObj.toDate().getHours(); // returns number 0–23
        }

        let lineEndHour = null
        if (todayEndTimeObj?.toDate) {
            lineEndHour = todayEndTimeObj.toDate().getHours(); // returns number 0–23
        }

        // Extract the hour from the input value (lineStartTime is like "08:30")
        const filterStartHour = lineStartTime ? parseInt(lineStartTime.split(':')[0], 10) : null;
        const filterEndHour = lineEndTime ? parseInt(lineEndTime.split(':')[0], 10) : null;

        // Compare only the hours
        const matchesStartTime = lineStartTime === '' || lineStartHour === filterStartHour;
        const matchesEndTime = lineEndTime === '' || lineEndHour === filterEndHour;

        // filter line status
        const matchesStatus = lineStatus === '' || lineStatus === status;

        return (
            matchesName && 
            matchesDriverName && 
            matchesDriver && 
            haveRiders &&
            isActiveToday &&
            matchesStartTime && 
            matchesEndTime && 
            matchesStatus
        )
    });

    const sortedFilteredLines = filteredLines.sort((a, b) => {
        const todayIndex = new Date().getDay();

        const aStart = a.timeTable?.[todayIndex]?.startTime?.toDate?.();
        const bStart = b.timeTable?.[todayIndex]?.startTime?.toDate?.();

        // If both have valid start times, compare
        if (aStart && bStart) {
            return aStart.getTime() - bStart.getTime(); // ascending
        }

        // If only one has a start time, prioritize it
        if (aStart) return -1;
        if (bStart) return 1;

        return 0; // fallback
    });

    // Filter by line name
    const handleLineNameChange = (e) => {
        setLineNameFilter(e.target.value);
    };

    // Filter by line destination
    const handleLineDriverNameChange = (e) => {
        setLineDriverName(e.target.value);
    };

    // Filter by line start time
    const handleLineStartTimeChange = (e) => {
        setLineStartTime(e.target.value)
    }

    // Filter by line start time
    const handleLineEndTimeChange = (e) => {
        setLineEndTime(e.target.value)
    }

    // Filter by line status
    const handleLineStatusChange = (e) => {
        setLineStatus(e.target.value);
    }
    
    //Select a line
    const selectLine = (line) => {
        const driver = drivers.find((d) => d.id === line.driver_id);
        const todayTracking = driver?.dailyTracking?.[yearMonthKey]?.[dayKey];
        const todayLine = todayTracking?.today_lines?.find((l) => l.id === line.id);

        const firstTripStarted = todayLine?.first_phase?.phase_started;
        const firstTripFinished = todayLine?.first_phase?.phase_finished;
        const secondTripStarted = todayLine?.second_phase?.phase_started;
        const secondTripFinished = todayLine?.second_phase?.phase_finished;

        let lineStatus = 'لم تبدأ بعد';
        if (secondTripFinished) lineStatus = 'رحلة العودة انتهت';
        else if (secondTripStarted) lineStatus = 'رحلة العودة بدأت';
        else if (firstTripFinished) lineStatus = 'رحلة الذهاب انتهت';
        else if (firstTripStarted) lineStatus = 'رحلة الذهاب بدأت';

        setSelectedLine({
            ...line,
            driver,
            todayLine,
            lineStatus,
        });
    }

    const getStatusMessage = (status) => {
        switch (status) {
            case 'لم تبدأ بعد':
                return 'الرحلة لم تبدأ بعد';
            case 'رحلة الذهاب انتهت':
                return 'رحلة الذهاب انتهت';
            case 'رحلة العودة انتهت':
                return 'رحلة العودة انتهت';
            default:
                return 'الرحلة لم تبدأ بعد';
        }
    };

    // Handle map load
    const handleMapLoad = (map) => {
        mapRef.current = map; // Store the map instance
    };

    useEffect(() => {
        let unsubscribeFn;

        const trackDriver = async () => {
            if (!selectedLine?.driver_id) return;

            try {
                const driverRef = doc(DB, 'drivers', selectedLine.driver_id);
                const { Marker } = await window.google.maps.importLibrary('marker');

                unsubscribeFn = onSnapshot(driverRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const newLocation = data.current_location;

                        // Validate coordinates
                        if (
                            !newLocation ||
                            typeof newLocation.latitude !== 'number' ||
                            typeof newLocation.longitude !== 'number'
                        ) {
                            console.log("Invalid driver location data:", newLocation);
                            return;
                        }

                        const latLng = {
                            lat: newLocation.latitude,
                            lng: newLocation.longitude,
                        };

                        // First time: create marker
                        if (!animatedDriverLocation.current) {
                            animatedDriverLocation.current = new Marker({
                                position: latLng,
                                map: mapRef.current,
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    fillColor: '#3989FC',
                                    fillOpacity: 1,
                                    strokeColor: '#fff',
                                    strokeWeight: 2,
                                    scale: 6,
                                },
                            });
                            setMapLoading(false);
                        } else {
                            // Update existing marker position
                            animatedDriverLocation.current.setPosition(latLng);
                            if (!animatedDriverLocation.current.getMap()) {
                                animatedDriverLocation.current.setMap(mapRef.current);
                            }
                        }

                        setDriverLocation(latLng);
                        checkAndUpdateOriginLocation(newLocation);
                    }
                });
            } catch (error) {
                console.log("Error setting up driver tracking:", error);
            }
        };

        trackDriver();

        return () => {
            if (unsubscribeFn) unsubscribeFn();
            if (animatedDriverLocation.current) {
                animatedDriverLocation.current.setMap(null);
                animatedDriverLocation.current = null;
            }
        };
    }, [selectedLine?.driver_id,mapLoading]);

    const lastOriginUpdateTime = useRef(Date.now());

    const checkAndUpdateOriginLocation = (currentLocation) => {
        if (!driverOriginLocation) {
            setDriverOriginLocation(currentLocation);
            return;
        }

        const now = Date.now();
        if (now - lastOriginUpdateTime.current < 30000) return;

        const distance = haversine(driverOriginLocation, currentLocation, { unit: "meter" });

        if (!isNaN(distance) && distance > 400) {
            setDriverOriginLocation(currentLocation);
            lastOriginUpdateTime.current = now;
        }
    };

    // Handle back action
    const goBack = () => {
        setSelectedLine(null)
    }
          
    // Render lines titles
    const linesTitles = () => (
        <>
            {!selectedLine ? (
                <div className='students-section-inner'>
                    <div className='students-section-inner-titles'>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineNameChange} 
                                value={lineNameFilter}
                                placeholder='رمز الخط' 
                                type='text' 
                                className='students-section-inner-title_search_input'
                                style={{width:'200px'}}
                            />
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineDriverNameChange} 
                                value={lineDriverName}
                                placeholder='السائق' 
                                type='text' 
                                className='students-section-inner-title_search_input'
                                style={{width:'200px'}}
                            />
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineStartTimeChange} 
                                value={lineStartTime} 
                                type='time' 
                                className='students-section-inner-title_search_input'
                                style={{width:'100px',marginRight:'5px'}}
                            />
                            <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>بداية الدوام</label>
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineEndTimeChange} 
                                value={lineEndTime} 
                                type='time' 
                                className='students-section-inner-title_search_input'
                                style={{width:'100px',marginRight:'5px'}}
                            />
                            <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>نهاية الدوام</label>
                        </div>
                        <div className='students-section-inner-title' style={{width:'200px'}}>
                            <select
                                onChange={handleLineStatusChange}
                                value={lineStatus}
                            >
                                <option value=''>الحالة</option>
                                <option value='لم تبدأ بعد'>لم تبدأ بعد</option>
                                <option value='رحلة الذهاب بدأت'>رحلة الذهاب بدأت</option>
                                <option value='رحلة الذهاب انتهت'>رحلة الذهاب انتهت</option>
                                <option value='رحلة العودة بدأت'>رحلة العودة بدأت</option>
                                <option value='رحلة العودة انتهت'>رحلة العودة انتهت </option>
                            </select>
                        </div>
                    </div>
                    <div className='all-items-list'>
                        {sortedFilteredLines.map((line,index) => {
                            const { status,driverName,driverFName } = getDriverAndStatus(line);
    
                            // Get today’s start time from timetable (optional enhancement)
                            const today = new Date().getDay(); // 0=Sunday
                            const startTimeObj = line.timeTable?.[today]?.startTime;
                            const endTimeObj = line.timeTable?.[today]?.endTime;

                            const startTime = startTimeObj?.toDate?.().toLocaleTimeString('en-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }) || '--';

                            const endTime = endTimeObj?.toDate?.().toLocaleTimeString('en-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }) || '--';

                            return(
                                <div key={index} onClick={() => selectLine(line)} className='single-item'>
                                    <div style={{width:'320px'}}>
                                        <h5>{line.id}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{driverName} {' '} {driverFName}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{startTime}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{endTime}</h5>
                                    </div>
                                    <div style={{width:'200px'}}>
                                        <h5 className={getLineStatusClass(status)}>{status}</h5>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="item-detailed-data-container">
                    <div className='item-detailed-data-header'>
                        <div className='item-detailed-data-header-title' style={{gap:'7px'}}>
                            <h5>{selectedLine.id}</h5>
                            <h5>-</h5>
                            <h5>{selectedLine.destination}</h5>
                            <h5>-</h5>
                            <h5>{selectedLine.name || '-'}</h5>
                        </div>
                        <button className="info-details-back-button" onClick={goBack}>
                            <BsArrowLeftShort size={24}/>
                        </button>
                    </div>
                    <div className="item-detailed-data-main">
                        <div className="student-detailed-data-main-firstBox">
                            <div className="item-detailed-data-main-firstBox-line-students" style={{flexDirection:'column'}}>
                                <div className='toggle-between-school-company-container' style={{border:'none',gap:'10px',marginBottom:'10px'}}>
                                    <div
                                        className={`toggle-between-school-company-btn ${lineTripPhase === 'first' ? 'active' : ''}`} 
                                        onClick={() => setLineTripPhase('first')}
                                    >
                                        <h5>رحلة الذهاب</h5>
                                    </div>
                                    <div
                                        className={`toggle-between-school-company-btn ${lineTripPhase === 'second' ? 'active' : ''}`} 
                                        onClick={() => setLineTripPhase('second')}
                                    >
                                        <h5>رحلة العودة</h5>
                                    </div>
                                </div>
                                {lineTripPhase === 'first' ? (
                                    <div className= "line-student-dropdown-open" style={{height:'53vh'}}>
                                        {selectedLine?.todayLine?.first_phase?.phase_started ? (
                                            <>
                                                <div className='trip-dropdown-item'>
                                                    <h5>بداية الرحلة</h5>
                                                    <h5 style={{fontWeight:'bold'}}>{selectedLine?.todayLine?.first_phase?.phase_starting_time}</h5>
                                                </div>
                                                <div className='trip-dropdown-item'>
                                                    <h5>الوصول للوجهة</h5>
                                                    <h5 style={{fontWeight:'bold'}}>{selectedLine?.todayLine?.first_phase?.phase_finishing_time ||'--'}</h5>
                                                </div>
                                                <div className= "line-student-dropdown-open-riders-list">
                                                {selectedLine?.todayLine?.first_phase?.riders?.map((rider) => (
                                                    <div key={rider?.id} className='trip-dropdown-item'>
                                                        <h5>{rider?.name} {rider?.family_name}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider?.phone_number}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider?.id}</h5>     
                                                        {rider?.checked_at_home && (
                                                            <>
                                                                <h5>-</h5>
                                                                <h5 style={{fontWeight:'bold'}}>{rider?.picked_up_time}</h5>
                                                            </>                                                    
                                                        )}                                           
                                                        {rider?.picked_up && (
                                                            <MdCheckCircle size={22} color='#328E6E'/>  
                                                        )} 
                                                        {rider?.checked_at_home && !rider?.picked_up && (
                                                            <IoMdCloseCircle size={22} color='#D64545'/>
                                                        )}                                                 
                                                    </div>
                                                ))}
                                                </div>
                                            </>
                                        ) : (
                                            <h5 className="no-students">الرحلة لم تبدا</h5>
                                        )}
                                    </div>
                                ) : (
                                    <div className= "line-student-dropdown-open" style={{height:'53vh'}}>
                                        {selectedLine?.todayLine?.second_phase?.phase_started ? (
                                            <>
                                                {selectedLine?.todayLine?.second_phase?.riders?.map((rider) => (
                                                    <div key={rider?.id} className='trip-dropdown-item'>
                                                        <h5>{rider?.name} {rider?.family_name}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider?.phone_number}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider?.id}</h5>
                                                        {rider?.dropped_off && (
                                                            <MdCheckCircle size={22} color='green'/>  
                                                        )} 
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <h5 className="no-students">الرحلة لم تبدا</h5>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="item-detailed-data-main-second-box">
                            {((lineTripPhase === 'first' && selectedLine?.lineStatus === 'رحلة الذهاب بدأت') ||
                             (lineTripPhase === 'second' && selectedLine?.lineStatus === 'رحلة العودة بدأت')) && selectedLine.driver?.current_location ? (
                                <div>
                                    <GoogleMap
                                        mapContainerStyle={{ width: "450px", height: "400px" }}
                                        center={{
                                            lat: selectedLine?.driver?.current_location?.latitude,
                                            lng: selectedLine?.driver?.current_location?.longitude
                                        }}
                                        zoom={14}
                                        onLoad={handleMapLoad}
                                    >

                                        {/* Render Riders */}
                                        {selectedLine.lineStatus === 'رحلة الذهاب بدأت' &&
                                            Array.isArray(selectedLine?.todayLine?.first_phase?.riders) &&
                                            selectedLine?.todayLine?.first_phase?.riders?.map((r) => (
                                                <Marker
                                                    key={r.id}
                                                    position={{ 
                                                        lat: r.home_location?.latitude, 
                                                        lng: r.home_location?.longitude 
                                                    }}
                                                    icon={{
                                                        url: r.picked_up
                                                            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                                            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                                    }}
                                                />
                                            ))
                                        }

                                        {selectedLine.lineStatus === 'رحلة الذهاب بدأت' &&
                                            <Marker
                                                position={{
                                                    lat: selectedLine?.todayLine?.first_phase?.destination_location?.latitude,
                                                    lng: selectedLine?.todayLine?.first_phase?.destination_location?.longitude
                                                }}
                                                icon={{
                                                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                                }}
                                            />
                                        }

                                        {selectedLine.lineStatus === 'رحلة العودة بدأت' &&
                                            Array.isArray(selectedLine?.todayLine?.second_phase?.riders) &&
                                            selectedLine?.todayLine?.second_phase?.riders?.map((r) => (
                                                <Marker
                                                    key={r.id}
                                                    position={{ 
                                                        lat: r.home_location.latitude, 
                                                        lng: r.home_location.longitude 
                                                    }}
                                                    icon={{
                                                        url: r.dropped_off
                                                            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                                            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                                    }}
                                                />
                                            ))
                                        }
                                    </GoogleMap>
                                </div>
                            ) : (
                                <div>
                                    <Image
                                        src={mapImage}
                                        width={400}
                                        height={200}
                                        alt="Driver is not moving"
                                    />
                                    <h5 style={{ textAlign: 'center', marginTop: '10px',fontWeight:'bold' }}>
                                        {getStatusMessage(selectedLine.lineStatus)}
                                    </h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
        
    return (
        <div className='white_card-section-container'>
            <div>
                {!selectedLine && (
                    <div className='line-calender-box'>
                        <div className='line-calender-box-dayDate'>
                            <p style={{fontSize:'15px'}}>{todayDate}</p>
                        </div>
                    </div>
                )}
                <>
                    {linesTitles()}
                </>
                
            </div>
        </div>
    )
}

export default DailyStatus